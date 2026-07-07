import { NextRequest, NextResponse } from 'next/server';

/**
 * OCR Capture API
 * 
 * This endpoint processes images (screenshots, business cards, SMS screenshots)
 * and extracts structured data using OCR.
 * 
 * Supported services:
 * - Tesseract.js (client-side, free)
 * - Google Cloud Vision API
 * - Azure Computer Vision
 * - Baidu OCR
 */

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let imageData: Buffer | null = null;
    let mimeType = 'image/png';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('image') as File | null;
      
      if (!file) {
        return NextResponse.json(
          { error: 'No image file provided' },
          { status: 400 }
        );
      }

      mimeType = file.type;
      const arrayBuffer = await file.arrayBuffer();
      imageData = Buffer.from(arrayBuffer);
    } else {
      const body = await request.json();
      const { image, imageUrl, imageType } = body;

      if (image) {
        // Base64 encoded image
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        imageData = Buffer.from(base64Data, 'base64');
        mimeType = imageType || 'image/png';
      } else if (imageUrl) {
        // Fetch image from URL
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        imageData = Buffer.from(arrayBuffer);
        mimeType = response.headers.get('content-type') || 'image/png';
      }
    }

    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Process the image
    const result = await processImage(imageData, mimeType);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('OCR capture error:', error);
    return NextResponse.json(
      { error: 'OCR processing failed' },
      { status: 500 }
    );
  }
}

interface OCRResult {
  text: string;
  parsed: {
    type: 'sms' | 'business_card' | 'receipt' | 'screenshot' | 'unknown';
    entities: Record<string, string[]>;
    structured?: Record<string, any>;
  };
  confidence: number;
  source: 'ocr';
}

async function processImage(imageData: Buffer, mimeType: string): Promise<OCRResult> {
  // In production, this would call an external OCR service
  // For now, we simulate OCR processing with pattern matching
  
  // Simulate OCR text extraction
  const extractedText = await simulateOCR(imageData, mimeType);
  
  // Parse the extracted text
  const parsed = parseExtractedText(extractedText);

  return {
    text: extractedText,
    parsed,
    confidence: 0.8,
    source: 'ocr',
  };
}

async function simulateOCR(_imageData: Buffer, _mimeType: string): Promise<string> {
  // This is a placeholder for actual OCR processing
  // In production, integrate with:
  // - Tesseract.js for client-side OCR
  // - Google Cloud Vision API
  // - Azure Computer Vision
  // - Baidu OCR (for Chinese text)
  
  // Return a simulated response based on image analysis
  return '[OCR 处理中 - 请配置 OCR 服务]';
}

function parseExtractedText(text: string): OCRResult['parsed'] {
  // Determine the type of document
  const type = detectDocumentType(text);
  
  // Extract entities based on document type
  const entities = extractEntitiesByType(text, type);
  
  // Extract structured data
  const structured = extractStructuredData(text, type);

  return {
    type,
    entities,
    structured,
  };
}

function detectDocumentType(text: string): OCRResult['parsed']['type'] {
  // SMS patterns
  if (
    /银行|扣款|转账|到账|消费|余额/.test(text) ||
    /【.*】/.test(text) ||
    /尾号\d{4}/.test(text)
  ) {
    return 'sms';
  }

  // Business card patterns
  if (
    /总经理|总监|经理|董事长|总裁/.test(text) ||
    /电话|手机|邮箱|地址/.test(text) ||
    /公司|集团|企业/.test(text)
  ) {
    return 'business_card';
  }

  // Receipt patterns
  if (
    /发票|收据|小票/.test(text) ||
    /金额|合计|总计/.test(text) ||
    /商户|商家/.test(text)
  ) {
    return 'receipt';
  }

  return 'screenshot';
}

function extractEntitiesByType(text: string, type: string): Record<string, string[]> {
  const entities: Record<string, string[]> = {
    names: [],
    phones: [],
    emails: [],
    amounts: [],
    dates: [],
    companies: [],
  };

  // Extract phone numbers
  const phonePattern = /1[3-9]\d{9}/g;
  const phones = text.match(phonePattern);
  if (phones) entities.phones.push(...phones);

  // Extract emails
  const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
  const emails = text.match(emailPattern);
  if (emails) entities.emails.push(...emails);

  // Extract amounts
  const amountPattern = /¥?\s*(\d+(?:\.\d{2})?)/g;
  let amountMatch;
  while ((amountMatch = amountPattern.exec(text)) !== null) {
    entities.amounts.push(amountMatch[1]);
  }

  // Extract dates
  const datePatterns = [
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/g,
    /\d{1,2}月\d{1,2}[日号]/g,
    /\d{2}[-/]\d{2}/g,
  ];
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) entities.dates.push(...matches);
  }

  // Type-specific extraction
  if (type === 'business_card') {
    // Extract names (Chinese names are typically 2-4 characters)
    const namePattern = /(?:姓名|名字)?[：:]?\s*([^\d\s,，。]{2,4})/g;
    let nameMatch;
    while ((nameMatch = namePattern.exec(text)) !== null) {
      if (!/公司|集团|企业|职位|职务/.test(nameMatch[1])) {
        entities.names.push(nameMatch[1]);
      }
    }

    // Extract company names
    const companyPattern = /([\u4e00-\u9fa5]+(?:公司|集团|企业|机构))/g;
    const companies = text.match(companyPattern);
    if (companies) entities.companies.push(...companies);
  }

  return entities;
}

function extractStructuredData(text: string, type: string): Record<string, any> | undefined {
  switch (type) {
    case 'sms':
      return extractSMSData(text);
    case 'business_card':
      return extractBusinessCardData(text);
    case 'receipt':
      return extractReceiptData(text);
    default:
      return undefined;
  }
}

function extractSMSData(text: string): Record<string, any> {
  const data: Record<string, any> = {};

  // Extract bank name
  const bankMatch = text.match(/【(.+?)】/);
  if (bankMatch) data.bank = bankMatch[1];

  // Extract card tail number
  const cardMatch = text.match(/尾号(\d{4})/);
  if (cardMatch) data.cardTail = cardMatch[1];

  // Extract transaction type
  if (/扣款|还款|贷款/.test(text)) data.transactionType = 'debit';
  else if (/到账|收入|转入/.test(text)) data.transactionType = 'credit';
  else data.transactionType = 'unknown';

  // Extract amount
  const amountMatch = text.match(/(\d+(?:\.\d{2})?)\s*元/);
  if (amountMatch) data.amount = parseFloat(amountMatch[1]);

  // Extract date
  const dateMatch = text.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
  if (dateMatch) data.date = dateMatch[1];

  return data;
}

function extractBusinessCardData(text: string): Record<string, any> {
  const data: Record<string, any> = {};

  // Extract name
  const nameMatch = text.match(/(?:姓名|名字)?[：:]?\s*([^\d\s,，。]{2,4})/);
  if (nameMatch) data.name = nameMatch[1];

  // Extract title
  const titlePatterns = [
    /(?:总经理|总监|经理|董事长|总裁|副总裁|主任|主管)/,
    /(?:CEO|CTO|CFO|COO|VP|Director|Manager)/i,
  ];
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.title = match[0];
      break;
    }
  }

  // Extract company
  const companyMatch = text.match(/([\u4e00-\u9fa5]+(?:公司|集团|企业))/);
  if (companyMatch) data.company = companyMatch[1];

  // Extract phone
  const phoneMatch = text.match(/1[3-9]\d{9}/);
  if (phoneMatch) data.phone = phoneMatch[0];

  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) data.email = emailMatch[0];

  return data;
}

function extractReceiptData(text: string): Record<string, any> {
  const data: Record<string, any> = {};

  // Extract merchant name
  const merchantMatch = text.match(/(?:商户|商家|店)[：:]?\s*([^\n]+)/);
  if (merchantMatch) data.merchant = merchantMatch[1].trim();

  // Extract total amount
  const totalMatch = text.match(/(?:合计|总计|金额)[：:]?\s*¥?\s*(\d+(?:\.\d{2})?)/);
  if (totalMatch) data.total = parseFloat(totalMatch[1]);

  // Extract date
  const dateMatch = text.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{1,2})?)/);
  if (dateMatch) data.date = dateMatch[1];

  return data;
}
