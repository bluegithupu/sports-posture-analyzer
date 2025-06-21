// 测试改进后的专业AI分析提示词模板
import { describe, it, expect } from '@jest/globals';
import { generateAnalysisPrompt } from '../../lib/genai';

describe('专业AI分析提示词模板', () => {
    describe('专业角色设定', () => {
        it('应该包含专业运动姿态分析师角色', () => {
            const prompt = generateAnalysisPrompt('video', 1);

            expect(prompt).toContain('专业运动姿态与体态分析大师');
            expect(prompt).toContain('20年经验');
            expect(prompt).toContain('运动生物力学博士学位');
            expect(prompt).toContain('国际认证的运动康复师');
            expect(prompt).toContain('奥运选手和职业运动员');
        });

        it('应该包含专业资质描述', () => {
            const prompt = generateAnalysisPrompt('image', 1);

            expect(prompt).toContain('人体解剖学');
            expect(prompt).toContain('运动力学');
            expect(prompt).toContain('损伤预防');
            expect(prompt).toContain('体态矫正专家');
        });
    });

    describe('视频分析提示词', () => {
        it('应该生成专业的视频分析提示词', () => {
            const prompt = generateAnalysisPrompt('video', 1);

            expect(prompt).toContain('专业分析报告');
            expect(prompt).toContain('视频动态分析重点');
            expect(prompt).toContain('动作序列的流畅性和连贯性');
            expect(prompt).toContain('动作节奏和时序控制');
        });

        it('应该包含所有专业分析类别', () => {
            const prompt = generateAnalysisPrompt('video', 1);

            expect(prompt).toContain('运动项目识别与动作分解');
            expect(prompt).toContain('体态与姿势评估');
            expect(prompt).toContain('动作技术分析');
            expect(prompt).toContain('问题识别与风险评估');
            expect(prompt).toContain('专业改进方案');
            expect(prompt).toContain('专业安全建议');
        });

        it('应该包含生物力学专业术语', () => {
            const prompt = generateAnalysisPrompt('video', 1);

            expect(prompt).toContain('生物力学特征');
            expect(prompt).toContain('力量传递链');
            expect(prompt).toContain('动力链');
            expect(prompt).toContain('脊柱对齐');
            expect(prompt).toContain('骨盆位置');
        });
    });

    describe('图片分析提示词', () => {
        it('应该生成专业的单张图片分析提示词', () => {
            const prompt = generateAnalysisPrompt('image', 1);

            expect(prompt).toContain('静态姿态分析重点');
            expect(prompt).toContain('精确的单帧姿态评估');
            expect(prompt).toContain('生物力学合理性');
            expect(prompt).toContain('静态稳定性和平衡状态');
        });

        it('应该生成专业的多张图片分析提示词', () => {
            const prompt = generateAnalysisPrompt('image', 3);

            expect(prompt).toContain('多图片对比分析重点');
            expect(prompt).toContain('对比分析3张图片中的姿态变化');
            expect(prompt).toContain('动作学习进程和技术改善情况');
            expect(prompt).toContain('一致性问题和变异模式');
            expect(prompt).toContain('基于进展的个性化建议');
        });

        it('应该正确处理2张图片的情况', () => {
            const prompt = generateAnalysisPrompt('image', 2);

            expect(prompt).toContain('对比分析2张图片中的姿态变化');
            expect(prompt).toContain('多图片对比分析重点');
        });

        it('应该包含专业的解剖学术语', () => {
            const prompt = generateAnalysisPrompt('image', 1);

            expect(prompt).toContain('颈椎、胸椎、腰椎');
            expect(prompt).toContain('骨盆前倾、后倾或侧倾');
            expect(prompt).toContain('肩胛骨稳定性');
            expect(prompt).toContain('踝、膝、髋、肩');
            expect(prompt).toContain('肌肉失衡模式');
        });
    });

    describe('专业提示词一致性', () => {
        it('视频和图片分析应该有相同的专业基础结构', () => {
            const videoPrompt = generateAnalysisPrompt('video', 1);
            const imagePrompt = generateAnalysisPrompt('image', 1);

            // 检查共同的专业角色设定
            expect(videoPrompt).toContain('专业运动姿态与体态分析大师');
            expect(imagePrompt).toContain('专业运动姿态与体态分析大师');

            // 检查共同的专业分析类别
            const commonCategories = [
                '运动项目识别与动作分解',
                '体态与姿势评估',
                '动作技术分析',
                '问题识别与风险评估',
                '专业改进方案',
                '专业安全建议'
            ];

            commonCategories.forEach(category => {
                expect(videoPrompt).toContain(category);
                expect(imagePrompt).toContain(category);
            });

            // 检查专业结尾
            expect(videoPrompt).toContain('专业运动姿态分析师的身份');
            expect(imagePrompt).toContain('专业运动姿态分析师的身份');
        });

        it('应该根据媒体类型调整专业分析重点', () => {
            const videoPrompt = generateAnalysisPrompt('video', 1);
            const imagePrompt = generateAnalysisPrompt('image', 1);

            // 视频特有的专业内容
            expect(videoPrompt).toContain('视频动态分析重点');
            expect(videoPrompt).toContain('疲劳状态下的动作变化');
            expect(videoPrompt).toContain('重复动作的一致性');

            // 图片特有的专业内容
            expect(imagePrompt).toContain('静态姿态分析重点');
            expect(imagePrompt).toContain('肌肉激活模式');
            expect(imagePrompt).toContain('从当前姿态转换到动作的风险');
        });
    });

    describe('专业术语和科学性', () => {
        it('应该包含专业的生物力学术语', () => {
            const prompt = generateAnalysisPrompt('video', 1);

            expect(prompt).toContain('代偿模式');
            expect(prompt).toContain('矫正性训练');
            expect(prompt).toContain('功能性限制');
            expect(prompt).toContain('关节活动度');
            expect(prompt).toContain('核心稳定性');
        });

        it('应该体现专业评估的科学性', () => {
            const prompt = generateAnalysisPrompt('image', 2);

            expect(prompt).toContain('科学性、专业性和实操性');
            expect(prompt).toContain('预防性措施');
            expect(prompt).toContain('训练负荷管理');
            expect(prompt).toContain('专业医疗或康复指导');
        });
    });

    describe('边界情况', () => {
        it('应该正确处理默认参数', () => {
            const prompt = generateAnalysisPrompt('video');
            expect(prompt).toContain('专业运动姿态与体态分析大师');
            expect(prompt).toContain('视频动态分析重点');
        });

        it('应该正确处理单张图片的专业分析', () => {
            const prompt = generateAnalysisPrompt('image', 1);
            expect(prompt).toContain('静态姿态分析重点');
            expect(prompt).not.toContain('对比分析');
        });
    });
});
