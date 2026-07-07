import { NextRequest, NextResponse } from 'next/server';

/**
 * Voice Capture API
 * 
 * This endpoint processes audio data and returns transcription.
 * In production, this would integrate with a speech-to-text service like:
 * - OpenAI Whisper API
 * - Google Cloud Speech-to-Text
 * - Azure Cognitive Services Speech
 * 
 * For now, it accepts pre-transcribed text from the client-side Web Speech API.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio, transcript, language = 'zh-CN' } = body;

    // If transcript is provided directly from client-side recognition
    if (transcript) {
      // Process the transcript through our existing parse-input pipeline
      const parseResult = await processTranscript(transcript, language);
      
      return NextResponse.json({
        success: true,
        transcript,
        parsed: parseResult,
        source: 'voice',
      });
    }

    // If audio blob is provided, we would send it to a speech-to-text service
    if (audio) {
      // In production, this would call an external STT service
      // For now, return a placeholder response
      return NextResponse.json({
        success: true,
        transcript: '[音频处理中 - 请配置 STT 服务]',
        parsed: null,
        source: 'voice',
        note: 'Audio processing requires STT service configuration',
      });
    }

    return NextResponse.json(
      { error: 'Missing audio or transcript' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Voice capture error:', error);
    return NextResponse.json(
      { error: 'Voice capture failed' },
      { status: 500 }
    );
  }
}

async function processTranscript(transcript: string, language: string) {
  // Extract entities from the transcript
  const entities = extractEntities(transcript);
  
  return {
    text: transcript,
    language,
    entities,
    confidence: 0.85,
  };
}

function extractEntities(text: string) {
  const entities: Record<string, string[]> = {
    names: [],
    dates: [],
    amounts: [],
    categories: [],
  };

  // Extract names (simple pattern matching)
  const namePatterns = [
    /(?:给|送|为|找)\s*([^\s,，。！？]{2,4})/g,
    /(?:女儿|儿子|老婆|老公|爸爸|妈妈|爷爷|奶奶|客户|领导|同事)\s*([^\s,，。！？]{0,2})/g,
  ];

  for (const pattern of namePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        entities.names.push(match[1]);
      }
    }
  }

  // Extract dates
  const datePatterns = [
    /(?:下周[一二三四五六日天]|这周[一二三四五六日天]|明天|今天|后天|大后天)/g,
    /(?:\d{1,2}月\d{1,2}[日号])/g,
    /(?:\d{1,2}月\d{1,2}号?)/g,
    /(?:周[一二三四五六日天])/g,
  ];

  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      entities.dates.push(...matches);
    }
  }

  // Extract amounts
  const amountPattern = /(\d+(?:\.\d+)?)\s*(?:元|块|万|千|百)?(?:左右|以内|以下)?/g;
  let amountMatch;
  while ((amountMatch = amountPattern.exec(text)) !== null) {
    entities.amounts.push(amountMatch[1]);
  }

  // Extract categories
  const categoryKeywords: Record<string, string[]> = {
    gift: ['礼物', '礼品', '送礼', '买给'],
    meal: ['吃饭', '请客', '聚餐', '宴请', '饭店', '餐厅'],
    travel: ['出差', '旅行', '旅游', '酒店', '机票'],
    birthday: ['生日', '过生日', '庆生'],
    festival: ['春节', '中秋', '端午', '国庆', '元旦', '母亲节', '父亲节'],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        entities.categories.push(category);
        break;
      }
    }
  }

  return entities;
}
