import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const checkOKRQuality = async (objective: string, krs: string[]): Promise<string> => {
  const ai = getAiClient();
  const prompt = `作为战略管理专家，请检查以下 OKR 的设置质量：
    目标 (O): ${objective}
    关键结果 (KRs): ${krs.join('; ')}
    返回 Markdown 格式评估意见。`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: prompt }] }],
  });
  return response.text || "AI 检查暂时不可用";
};

export const analyzeProcessSketch = async (base64Image: string): Promise<{ nodes: any[], links: any[] }> => {
  const ai = getAiClient();
  const prompt = `Analyze this business process sketch. 
    Return a JSON object: 
    { "nodes": [{"label": "Name", "type": "start|process|decision|end", "x": 0-1000, "y": 0-1000}], 
      "links": [{"fromIndex": 0, "toIndex": 1}] }`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: base64Image } }
      ]
    },
    config: { responseMimeType: "application/json" }
  });

  const result = JSON.parse(response.text || '{"nodes":[], "links":[]}');
  const nodes = result.nodes.map((n: any, i: number) => ({
    ...n,
    id: `ai-node-${Date.now()}-${i}`,
    description: '',
    sipoc: { source: [], target: [], inputs: [], outputs: [], customers: [], standard: '', ownerRole: '' }
  }));

  const links = result.links.map((l: any, i: number) => ({
    id: `ai-link-${Date.now()}-${i}`,
    from: nodes[l.fromIndex]?.id,
    to: nodes[l.toIndex]?.id
  })).filter((l: any) => l.from && l.to);

  return { nodes, links };
};