import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const checkOKRQuality = async (objective: string, krs: string[]): Promise<string> => {
  const ai = getAiClient();
  const model = "gemini-3-flash-preview";
  const prompt = `
    作为战略管理专家，请检查以下 OKR 的设置质量：
    目标 (O): ${objective}
    关键结果 (KRs): ${krs.join('; ')}
    
    请根据 SMART 原则评估其“可衡量性”和“挑战性”，并给出具体的修改意见。
    如果包含模糊词汇（如“努力”、“加强”），请明确指出。
    返回 Markdown 格式。
  `;
  
  try {
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "AI 检查暂时不可用";
  } catch (e) {
    return "检查失败，请检查网络连接";
  }
};

export const checkPADQuality = async (plan: string, action: string, deliverable: string): Promise<string> => {
  const ai = getAiClient();
  const model = "gemini-3-flash-preview";
  const prompt = `
    请审核以下周度 PAD 工作计划：
    计划 (Plan): ${plan}
    行动 (Action): ${action}
    交付物 (Deliverable): ${deliverable}
    
    分析计划与交付物是否匹配，行动是否能支撑目标的达成。给出一条具体改进建议。
  `;
  try {
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "AI 检查暂时不可用";
  } catch (e) {
    return "检查失败";
  }
};

/**
 * AI Recognize Process Sketch
 * Converts an image of a handwritten or sketched process into nodes and links
 */
export const analyzeProcessSketch = async (base64Image: string): Promise<{ nodes: any[], links: any[] }> => {
  const ai = getAiClient();
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are a professional Business Process Analyst. 
    Analyze the provided image which contains a sketched or handwritten business process flow.
    Extract the key process steps (nodes) and the sequence of flow (links).
    
    Return the result strictly as a JSON object matching this schema:
    {
      "nodes": [
        {
          "label": "Brief step name",
          "type": "start" | "process" | "decision" | "end",
          "description": "Short description of the task",
          "x": number (suggested horizontal position, 0-1000),
          "y": number (suggested vertical position, 0-1000)
        }
      ],
      "links": [
        { "fromIndex": number (index of source node in the nodes array), "toIndex": number (index of target node) }
      ]
    }

    Note: 
    - Identify logical start and end points.
    - If there are branches, use type 'decision'.
    - Use clear, action-oriented labels (Verb + Noun).
    - Provide logical x, y coordinates to make it look organized.
  `;

  try {
    // Fixed: Simplified contents to follow single Content object with parts array per guideline
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || '{"nodes":[], "links":[]}');
    
    // Map indices to generated IDs for the application logic
    const nodes = result.nodes.map((n: any, i: number) => ({
      ...n,
      id: `ai-node-${Date.now()}-${i}`,
      sipoc: { source: [], target: [], inputs: [], outputs: [], customers: [], standard: '', ownerRole: '' }
    }));

    const links = result.links.map((l: any, i: number) => ({
      id: `ai-link-${Date.now()}-${i}`,
      from: nodes[l.fromIndex]?.id,
      to: nodes[l.toIndex]?.id
    })).filter((l: any) => l.from && l.to);

    return { nodes, links };
  } catch (e) {
    console.error("Sketch Analysis Error:", e);
    throw new Error("AI 识别草图失败");
  }
};
