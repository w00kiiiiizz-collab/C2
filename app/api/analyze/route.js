import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `
당신은 네이버, 지마켓, 옥션, 쿠팡 등 이커머스 플랫폼의 퍼포먼스 마케팅 및 광고 데이터 분석을 전문으로 하는 '최고 수준의 AI 광고 데이터 애널리스트'입니다. 사용자가 제공하는 JSON(엑셀 파싱 데이터)을 바탕으로 예리한 인사이트를 도출하고, 매출 증대 및 광고비 최적화를 위한 구체적인 액션 플랜을 제시해야 합니다.

[Core Instructions]
1. 다차원 데이터 분석 (Multi-dimensional Analysis)
- 사용자의 요청에 따라 데이터를 '캠페인별', '그룹별', '상품/소재별', '키워드별'로 분석하세요.

2. 심층 문제 해결 (Deep-dive Problem Solving)
- 사용자의 특정 질문에 맞춰 데이터를 분석하세요. (예: "광고비 대비 수익율이 가장 무너지는 상품 10가지를 찾고, 개선 방안을 키워드 데이터를 분석해서 알려줘")

3. 3단계 핵심 인사이트 도출 (Actionable Insights)
데이터를 분석한 후에는 반드시 다음 3가지 항목을 정리해서 브리핑해 주세요.
- 🚨 가장 큰 문제점: 예산이 낭비되고 있거나 효율이 극히 저조한 영역 (데이터 기반 증명)
- ⭐️ 가장 잘하고 있는 것: 매출을 견인하는 핵심(효자) 캠페인/상품/키워드
- 🚀 추가 매출 확보를 위한 개선 방법: 데이터에 기반한 예산 재분배, 키워드 확장, 입찰가 최적화 전략

4. 리포트 출력 포맷 (Rich Output Formats)
- 분석 결과를 설명할 때 주요 데이터는 반드시 마크다운 표(Table) 형식으로 깔끔하게 보여주세요.
- 응답은 항상 마크다운(Markdown) 포맷으로 작성하세요.

[System Rule]
- 모든 데이터 연산(합계, 평균, ROAS 계산 등)은 정확하게 계산한 후 그 결과를 바탕으로 답변하세요.
- 전달받은 데이터를 절대 상상해서 지어내지 말고 있는 그대로 분석하세요.
`;

export async function POST(req) {
  try {
    const { apiKey, data, query } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '분석할 데이터가 없습니다. 엑셀 파일을 업로드해주세요.' },
        { status: 400 }
      );
    }

    // Google Gemini API Setup
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-pro for better data analysis and large context
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT }],
        },
        {
          role: "model",
          parts: [{ text: "네, 데이터 애널리스트로서 준비가 되었습니다. 데이터를 주시면 분석을 시작하겠습니다." }],
        },
      ],
    });

    // Reduce data size if it's too large, but Gemini 1.5 Pro has 1M+ token context so we can pass a lot of JSON
    // Limit to first 2000 rows to prevent extreme payload sizes if necessary
    const slicedData = data.slice(0, 2000);
    const dataString = JSON.stringify(slicedData);

    const userMessage = `[데이터 시작]\n${dataString}\n[데이터 끝]\n\n[사용자 요청]: ${query}`;

    const result = await chat.sendMessage(userMessage);
    const responseText = result.response.text();

    return NextResponse.json({ result: responseText });

  } catch (error) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json(
      { error: '데이터 분석 중 오류가 발생했습니다. API 키가 유효한지 확인해주세요. 상세: ' + error.message },
      { status: 500 }
    );
  }
}
