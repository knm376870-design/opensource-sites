import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': 'https://russianhub.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const systemPrompt = `你是“俄语星球 AI 学习助理”，服务中国俄语学习者和在俄罗斯留学生。
回答必须准确、友好、简洁，并优先帮助用户真正学会，而不只是给答案。
规则：
1. 中俄翻译要给自然表达；必要时补充重音、语法、语境和更口语的版本。
2. 纠错时按“修改后—问题—解释—替代表达”组织。
3. 学习计划必须具体、可执行，并考虑用户水平和每日可用时间。
4. 对话陪练时保持用户要求的角色和水平，一次推进一轮；发现错误可温和纠正。
5. 只能把上下文中的资源称为本站资源；不要虚构网址。
6. 涉及签证、法律、医疗、学校规定、汇率或时效信息时，提醒用户以官方最新信息为准。
7. 不索取密码、验证码、证件号等敏感信息。拒绝作弊、违法和危险请求。
8. 默认用中文解释，俄语示例使用西里尔字母。`

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } })
  try {
    const key = Deno.env.get('OPENAI_API_KEY')
    if (!key) throw new Error('OPENAI_API_KEY is not configured')
    const body = await req.json()
    const message = String(body?.message || '').trim().slice(0, 2000)
    if (!message) return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    const history = Array.isArray(body?.history) ? body.history.slice(-12).map((x: any) => ({ role: x?.role === 'assistant' ? 'assistant' : 'user', content: String(x?.content || '').slice(0, 3000) })) : []
    const context = JSON.stringify(body?.context || {}).slice(0, 12000)
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') || 'gpt-5-mini',
        instructions: systemPrompt,
        input: [...history, { role: 'user', content: `用户当前问题：${message}\n\n可用的本站资源与学习状态：${context}` }],
        max_output_tokens: 1200,
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message || 'OpenAI request failed')
    const reply = data.output_text || data.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text
    if (!reply) throw new Error('Empty model response')
    return new Response(JSON.stringify({ reply }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'AI service is temporarily unavailable' }), { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
