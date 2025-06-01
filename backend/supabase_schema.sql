-- Supabase 数据库表结构
-- 用于记录体态分析事件

-- 创建 analysis_events 表
CREATE TABLE IF NOT EXISTS analysis_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    r2_video_link TEXT NOT NULL,
    gemini_file_link TEXT,
    analysis_report JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_analysis_events_created_at ON analysis_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_events_status ON analysis_events(status);

-- 启用行级安全 (RLS)
ALTER TABLE analysis_events ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有操作（如果需要更严格的权限控制，可以修改这个策略）
CREATE POLICY "Enable all operations for analysis_events" ON analysis_events
    FOR ALL USING (true) WITH CHECK (true);

-- 如果需要更严格的权限控制，可以使用以下策略替代上面的策略：
-- CREATE POLICY "Enable read access for all users" ON analysis_events FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for all users" ON analysis_events FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update access for all users" ON analysis_events FOR UPDATE USING (true);
-- CREATE POLICY "Enable delete access for all users" ON analysis_events FOR DELETE USING (true); 