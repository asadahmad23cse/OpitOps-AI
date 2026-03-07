"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, Rocket, DollarSign, Activity, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedPrompts = [
  { icon: AlertCircle, text: 'Why did health score drop?', color: 'text-red-400 bg-red-500/10' },
  { icon: AlertCircle, text: 'Show critical alerts', color: 'text-orange-400 bg-orange-500/10' },
  { icon: DollarSign, text: 'How can I reduce EC2 cost?', color: 'text-emerald-400 bg-emerald-500/10' },
  { icon: Rocket, text: 'Which deployment failed today?', color: 'text-cyan-400 bg-cyan-500/10' },
  { icon: Activity, text: 'Show infrastructure status', color: 'text-blue-400 bg-blue-500/10' },
  { icon: Sparkles, text: 'What optimizations are recommended?', color: 'text-purple-400 bg-purple-500/10' },
];

async function getAIResponse(userMessage: string): Promise<string> {
  // Context-aware rule-based responses using live data
  const dashRes = await fetch('/api/dashboard').then(r => r.json()).catch(() => null);
  const d = dashRes?.data;
  const msg = userMessage.toLowerCase();

  if (msg.includes('health') && msg.includes('score') || msg.includes('health score drop')) {
    if (d) {
      const warnings = d.healthScore.breakdown.filter((c: { status: string }) => c.status === 'warning');
      return `**Current Health Score: ${d.healthScore.score}/100** (${d.healthScore.trend > 0 ? '+' : ''}${d.healthScore.trend} points trend)\n\n${d.healthScore.checksPassed} checks passed, ${d.healthScore.warnings} warnings.\n\n${warnings.length > 0 ? `**Areas needing attention:**\n${warnings.map((w: { name: string; score: number; details: string }) => `- **${w.name}** (${w.score}/100): ${w.details}`).join('\n')}` : 'All categories are healthy.'}\n\n**Recommendation:** Address the warning categories to improve your score.`;
    }
    return 'I couldn\'t fetch the latest health data. Please try again.';
  }

  if (msg.includes('critical alert') || msg.includes('show') && msg.includes('alert')) {
    if (d) {
      const s = d.alertsSummary;
      return `**Active Alerts Summary:**\n- 🔴 Critical: ${s.critical}\n- 🟠 High: ${s.high}\n- 🟡 Medium: ${s.medium}\n- 🔵 Low: ${s.low}\n\n**Total Open:** ${s.open} | **Acknowledged:** ${s.acknowledged} | **Resolved:** ${s.resolved}\n\nVisit the [Alerts page](/alerts) for full details and to take action.`;
    }
  }

  if (msg.includes('ec2') || msg.includes('cost') || msg.includes('reduce') || msg.includes('save')) {
    if (d) {
      return `**Cost Overview:**\n- Current Month: $${d.costSnapshot.currentMonth}\n- Projected: $${d.costSnapshot.projected}\n- **Potential Savings: $${d.costSnapshot.potentialSavings}**\n\n**Top Recommendations:**\n${d.recommendations.map((r: { title: string; estimatedSavings: number; impact: string }) => `- **${r.title}**: Save $${r.estimatedSavings}/mo (${r.impact} impact)`).join('\n')}\n\nI recommend starting with high-impact, easy-difficulty items first.`;
    }
  }

  if (msg.includes('deployment') && (msg.includes('fail') || msg.includes('today'))) {
    if (d) {
      const s = d.deploymentsSummary;
      return `**Deployment Status:**\n- Total: ${s.total}\n- ✅ Successful: ${s.success}\n- 🔄 Running: ${s.running}\n- ❌ Failed: ${s.failed}\n- ↩️ Rolled Back: ${s.rolledBack}\n\nVisit the [Deployments page](/deployments) for details on any failed deployments.`;
    }
  }

  if (msg.includes('infrastructure') || msg.includes('status')) {
    if (d) {
      const nodes = d.infrastructure;
      return `**Infrastructure Status:**\n${nodes.map((n: { name: string; status: string; cpuAvg: number; nodes: number; totalNodes: number }) => `- **${n.name}**: ${n.status === 'operational' ? '✅' : n.status === 'degraded' ? '⚠️' : '🔴'} ${n.status} (CPU: ${n.cpuAvg}%, Nodes: ${n.nodes}/${n.totalNodes})`).join('\n')}\n\nOverall: ${nodes.filter((n: { status: string }) => n.status === 'operational').length}/${nodes.length} systems fully operational.`;
    }
  }

  if (msg.includes('optimization') || msg.includes('recommend')) {
    if (d) {
      return `**AI Recommendations:**\n${d.recommendations.map((r: { title: string; impact: string; estimatedSavings: number; performanceImprovement: string; status: string }) => `- **${r.title}** (${r.impact} impact): ${r.estimatedSavings > 0 ? `Save $${r.estimatedSavings}/mo` : r.performanceImprovement} — Status: ${r.status}`).join('\n')}\n\nWould you like me to explain any of these in more detail?`;
    }
  }

  return `I can help you with:\n- **Health Score Analysis** — Ask about your infrastructure health\n- **Alert Management** — View and understand active alerts\n- **Cost Optimization** — Find ways to reduce cloud spend\n- **Deployment Status** — Check recent deployment activity\n- **Infrastructure Monitoring** — Get real-time system status\n- **Recommendations** — See AI-powered optimization suggestions\n\nTry asking: "Show critical alerts" or "How can I reduce EC2 cost?"`;
}

export function EnhancedAIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: 'Hello! I\'m your AI DevOps assistant. I can help you understand your infrastructure health, analyze alerts, optimize costs, and more. What would you like to know?', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: messageText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getAIResponse(messageText);
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: response, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-6 h-[calc(100vh-16rem)]">
      {/* Chat Area */}
      <div className="col-span-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-black" />
                </div>
              )}
              <div className={`max-w-[70%] rounded-xl p-4 ${msg.role === 'user' ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-white/5 border border-white/10'}`}>
                <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-cyan-400 hover:underline">$1</a>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
                <p className="text-xs text-gray-600 mt-2">{msg.timestamp.toLocaleTimeString()}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-black" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask about your infrastructure..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-all"
              suppressHydrationWarning
            />
            <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-xl text-black font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" suppressHydrationWarning>
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Prompts */}
      <div className="space-y-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Suggested Prompts</h3>
          <div className="space-y-2">
            {suggestedPrompts.map(prompt => (
              <button key={prompt.text} onClick={() => handleSend(prompt.text)} disabled={isLoading} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg text-left hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50" suppressHydrationWarning>
                <div className={`p-1.5 rounded-lg ${prompt.color}`}><prompt.icon className="w-4 h-4" /></div>
                <span className="text-sm text-gray-300">{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Capabilities</h3>
          <ul className="space-y-1.5 text-xs text-gray-400">
            <li>• Infrastructure health analysis</li>
            <li>• Alert investigation</li>
            <li>• Cost optimization advice</li>
            <li>• Deployment status checks</li>
            <li>• Performance recommendations</li>
            <li>• Context-aware responses</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
