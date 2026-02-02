-- StratFlow AI - Granular MySQL Schema
CREATE DATABASE IF NOT EXISTS stratflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stratflow;

-- 1. 企业/租户表
CREATE TABLE IF NOT EXISTS enterprises (
    name VARCHAR(255) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    password VARCHAR(255) DEFAULT 'root'
) ENGINE=InnoDB;

-- 2. 用户表 (独立存储，修复登录问题)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    ent_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'User') DEFAULT 'User',
    department_id VARCHAR(100),
    UNIQUE KEY (ent_name, username),
    CONSTRAINT fk_user_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. 流程表 (精细化存储)
CREATE TABLE IF NOT EXISTS processes (
    id VARCHAR(100) PRIMARY KEY,
    ent_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    level TINYINT DEFAULT 1,
    version VARCHAR(20) DEFAULT 'Draft',
    is_active BOOLEAN DEFAULT FALSE,
    owner VARCHAR(100),
    co_owner VARCHAR(100),
    objective TEXT,
    nodes_json LONGTEXT,
    links_json LONGTEXT,
    history_json LONGTEXT,
    updated_at BIGINT,
    CONSTRAINT fk_proc_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. 部门表
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(100) PRIMARY KEY,
    ent_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    manager VARCHAR(100),
    roles_json TEXT,
    parent_id VARCHAR(100),
    CONSTRAINT fk_dept_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. 战略/OKR 表 (简易化存储在 strategy 记录中，每个租户一条)
CREATE TABLE IF NOT EXISTS strategies (
    ent_name VARCHAR(255) PRIMARY KEY,
    mission TEXT,
    vision TEXT,
    okrs_json LONGTEXT,
    CONSTRAINT fk_strat_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. 周报 PAD 表
CREATE TABLE IF NOT EXISTS weekly_pads (
    id VARCHAR(100) PRIMARY KEY,
    ent_name VARCHAR(255) NOT NULL,
    week_id VARCHAR(50) NOT NULL,
    owner_id VARCHAR(100) NOT NULL,
    type ENUM('dept', 'user') NOT NULL,
    entries_json LONGTEXT,
    CONSTRAINT fk_pad_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE
) ENGINE=InnoDB;
