import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { getCostAnomalyContext } from '@/lib/live-data';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL = 'llama3-70b-8192';

export async function GET() {
  const context = await getCostAnomalyContext();

  if (context.anomalies.length === 0) {
    return NextResponse.json({ hasAnomalies: false });
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_groq_key_here') {
    return NextResponse.json(
      { error: 'missing_api_key', message: 'GROQ_API_KEY is missing in environment.' },
      { status: 503 },
    );
  }

  try {
    const groq = new Groq({ apiKey });
    const prompt = `You are an SRE cost analyst. Given these cost anomalies: ${JSON.stringify(
      context,
      null,
      2,
    )}. Explain in 3-4 sentences what likely caused each spike, which deployment or traffic pattern is the probable cause, and one specific actionable recommendation per anomaly.`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Return concise, technically grounded analysis. Mention service names exactly as provided.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const aiExplanationRaw = completion.choices[0]?.message?.content;
    const aiExplanation =
      typeof aiExplanationRaw === 'string' && aiExplanationRaw.trim().length > 0
        ? aiExplanationRaw.trim()
        : 'Cost anomalies were detected but AI explanation is currently unavailable.';

    return NextResponse.json({
      hasAnomalies: true,
      anomalies: context.anomalies,
      aiExplanation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate anomaly explanation.';
    return NextResponse.json({ error: 'groq_error', message }, { status: 502 });
  }
}
