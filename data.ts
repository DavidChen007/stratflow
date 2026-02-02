
/**
 * StratFlow AI 数据层 (Data Access Layer) - HTTP API 版
 * 
 * 此文件已重构为通过 Fetch API 与 Node.js 后端通信。
 * 后端地址默认为 http://localhost:3001
 */

import { AppState, Enterprise } from "./types";

const API_BASE = "http://localhost:3001/api";

// 简单的请求封装
const api = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'API Request Failed');
    }
    
    // 某些接口可能没有返回值 (如 204 No Content)，这里简单处理
    const text = await response.text();
    return text ? JSON.parse(text) : {} as T;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

/**
 * 注册/更新企业账号
 * 后端路由: POST /enterprises
 */
export const saveEnterprise = async (ent: Enterprise): Promise<void> => {
  await api('/enterprises', {
    method: 'POST',
    body: JSON.stringify(ent)
  });
};

/**
 * 获取所有注册企业列表
 * 后端路由: GET /enterprises
 */
export const getEnterprises = async (): Promise<Enterprise[]> => {
  try {
    return await api<Enterprise[]>('/enterprises');
  } catch (e) {
    // 如果后端未启动，返回空数组以防前端崩溃，允许离线排查
    console.warn("无法连接到后端，请确保 Node.js 服务运行在 3001 端口");
    return [];
  }
};

/**
 * 持久化保存整个工作空间的状态
 * 后端路由: POST /workspace/:entName
 */
export const saveWorkspace = async (entName: string, state: AppState): Promise<void> => {
  await api(`/workspace/${entName}`, {
    method: 'POST',
    body: JSON.stringify({ state })
  });
};

/**
 * 读取企业的工作空间数据
 * 后端路由: GET /workspace/:entName
 */
export const getWorkspace = async (entName: string): Promise<AppState | null> => {
  const res = await api<{ state: AppState } | null>(`/workspace/${entName}`);
  return res ? res.state : null;
};
