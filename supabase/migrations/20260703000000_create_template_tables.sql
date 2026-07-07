-- Template System Tables Migration
-- Creates tables for identity, festival, gift, and scenario templates

-- Identity Templates Table
CREATE TABLE IF NOT EXISTS identity_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  compliance_rules JSONB DEFAULT '[]'::jsonb,
  recommendation_strategy JSONB DEFAULT '{}'::jsonb,
  greeting_style TEXT,
  is_preset BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Festival Templates Table
CREATE TABLE IF NOT EXISTS festival_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date_rule TEXT NOT NULL,
  date_rule_type TEXT NOT NULL CHECK (date_rule_type IN ('fixed', 'lunar', 'floating')),
  reminder_days_before INTEGER[] DEFAULT '{7,15,30}'::integer[],
  greeting_template TEXT,
  gift_suggestions JSONB DEFAULT '[]'::jsonb,
  compliance_multiplier NUMERIC(3,2) DEFAULT 1.00,
  is_preset BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gift Templates Table
CREATE TABLE IF NOT EXISTS gift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  occasions TEXT[] DEFAULT '{}'::text[],
  price_range JSONB DEFAULT '{"min": 0, "max": 1000}'::jsonb,
  description TEXT,
  purchase_links JSONB DEFAULT '[]'::jsonb,
  is_preset BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenario Templates Table
CREATE TABLE IF NOT EXISTS scenario_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  identity_template_ids UUID[] DEFAULT '{}'::uuid[],
  festival_template_ids UUID[] DEFAULT '{}'::uuid[],
  gift_template_ids UUID[] DEFAULT '{}'::uuid[],
  budget_range JSONB DEFAULT '{"min": 0, "max": 5000}'::jsonb,
  is_preset BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_identity_templates_category ON identity_templates(category);
CREATE INDEX IF NOT EXISTS idx_festival_templates_date_rule_type ON festival_templates(date_rule_type);
CREATE INDEX IF NOT EXISTS idx_gift_templates_category ON gift_templates(category);
CREATE INDEX IF NOT EXISTS idx_gift_templates_occasions ON gift_templates USING gin(occasions);
CREATE INDEX IF NOT EXISTS idx_scenario_templates_category ON scenario_templates(category);

-- Insert preset identity templates
INSERT INTO identity_templates (name, category, description, compliance_rules, recommendation_strategy, greeting_style, is_preset) VALUES
('国企高管', 'business', '国有企业高级管理人员，合规要求严格', '[{"type":"amount_limit","value":500,"unit":"CNY"},{"type":"forbidden_items","items":["现金","购物卡"]}]'::jsonb, '{"style":"formal","focus":"health_culture"}'::jsonb, '正式、尊重', true),
('上市公司高管', 'business', '上市公司董监高，合规披露要求', '[{"type":"amount_limit","value":1000,"unit":"CNY"}]'::jsonb, '{"style":"professional","focus":"quality"}'::jsonb, '专业、得体', true),
('家庭长辈', 'family', '父母、祖父母等长辈', '[{"type":"amount_limit","value":2000,"unit":"CNY"}]'::jsonb, '{"style":"warm","focus":"health"}'::jsonb, '温暖、孝顺', true),
('家庭晚辈', 'family', '子女、侄女等晚辈', '[{"type":"amount_limit","value":1000,"unit":"CNY"}]'::jsonb, '{"style":"encouraging","focus":"growth"}'::jsonb, '关爱、鼓励', true),
('亲密朋友', 'social', '关系密切的朋友', '[{"type":"amount_limit","value":800,"unit":"CNY"}]'::jsonb, '{"style":"casual","focus":"interests"}'::jsonb, '轻松、真诚', true),
('重要客户', 'business', '重要商业客户', '[{"type":"amount_limit","value":1500,"unit":"CNY"},{"type":"forbidden_items","items":["现金"]}]'::jsonb, '{"style":"professional","focus":"premium"}'::jsonb, '专业、重视', true)
ON CONFLICT DO NOTHING;

-- Insert preset festival templates
INSERT INTO festival_templates (name, date_rule, date_rule_type, reminder_days_before, greeting_template, gift_suggestions, compliance_multiplier, is_preset) VALUES
('春节', '01-01', 'lunar', '{7,15,30}', '恭祝新春快乐，万事如意！', '["年货礼盒","红包","保健品"]'::jsonb, 1.50, true),
('中秋节', '08-15', 'lunar', '{7,15,30}', '月圆人团圆，中秋快乐！', '["月饼礼盒","茶叶","水果篮"]'::jsonb, 1.20, true),
('母亲节', '05-02', 'floating', '{7,14,30}', '妈妈，您辛苦了！母亲节快乐！', '["鲜花","保健品","SPA卡"]'::jsonb, 1.00, true),
('父亲节', '06-03', 'floating', '{7,14,30}', '爸爸，您是最棒的！父亲节快乐！', '["茶叶","智能设备","书籍"]'::jsonb, 1.00, true),
('端午节', '05-05', 'lunar', '{7,15}', '端午安康，粽叶飘香！', '["粽子礼盒","茶叶","香囊"]'::jsonb, 1.00, true)
ON CONFLICT DO NOTHING;

-- Insert preset gift templates
INSERT INTO gift_templates (name, category, occasions, price_range, description, purchase_links, is_preset) VALUES
('茶叶礼盒', 'food', '{birthday,festival,visit}', '{"min":200,"max":1000}'::jsonb, '精选名茶，适合各类场合', '[{"platform":"jd","url":"https://item.jd.com/tea","price":388}]'::jsonb, true),
('保健品', 'health', '{birthday,festival,elder}', '{"min":300,"max":2000}'::jsonb, '健康关怀，适合长辈', '[{"platform":"jd","url":"https://item.jd.com/health","price":588}]'::jsonb, true),
('生日蛋糕', 'food', '{birthday}', '{"min":150,"max":500}'::jsonb, '生日必备，甜蜜祝福', '[{"platform":"meituan","url":"https://cake.meituan.com","price":268}]'::jsonb, true),
('红酒', 'drink', '{festival,business}', '{"min":200,"max":2000}'::jsonb, '高端红酒，商务送礼', '[{"platform":"jd","url":"https://item.jd.com/wine","price":688}]'::jsonb, true),
('书籍', 'culture', '{birthday,visit}', '{"min":50,"max":300}'::jsonb, '知识礼物，精神食粮', '[{"platform":"dangdang","url":"https://book.dangdang.com","price":128}]'::jsonb, true),
('鲜花', 'decoration', '{birthday,festival,mother}', '{"min":100,"max":500}'::jsonb, '鲜花传情，美好祝福', '[{"platform":"meituan","url":"https://flower.meituan.com","price":199}]'::jsonb, true),
('SPA卡', 'health', '{birthday,mother}', '{"min":300,"max":1000}'::jsonb, '放松身心，健康关怀', '[{"platform":"dianping","url":"https://spa.dianping.com","price":588}]'::jsonb, true),
('智能家电', 'tech', '{birthday,festival}', '{"min":500,"max":3000}'::jsonb, '科技生活，品质升级', '[{"platform":"jd","url":"https://item.jd.com/smart","price":1299}]'::jsonb, true)
ON CONFLICT DO NOTHING;

-- Insert preset scenario templates
INSERT INTO scenario_templates (name, category, description, budget_range, is_preset) VALUES
('客户生日宴请', 'business', '为重要客户准备生日宴请方案', '{"min":2000,"max":10000}'::jsonb, true),
('家庭生日庆祝', 'family', '为家庭成员准备生日庆祝', '{"min":500,"max":3000}'::jsonb, true),
('春节送礼', 'festival', '春节走亲访友送礼方案', '{"min":1000,"max":5000}'::jsonb, true),
('长辈健康关怀', 'family', '为长辈准备健康关怀礼品', '{"min":500,"max":2000}'::jsonb, true),
('孩子生日庆祝', 'family', '为孩子准备生日庆祝方案', '{"min":300,"max":2000}'::jsonb, true)
ON CONFLICT DO NOTHING;
