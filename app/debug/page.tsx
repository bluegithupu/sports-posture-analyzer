import { CompressionDebug } from "@/components/CompressionDebug";

export default function DebugPage() {
    return (
        <div className="min-h-screen bg-slate-900 py-8">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-bold text-center text-sky-300 mb-8">
                    压缩功能调试页面
                </h1>
                <CompressionDebug />
            </div>
        </div>
    );
} 