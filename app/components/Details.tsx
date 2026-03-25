import ScoreBadge from "~/components/ScoreBadge";

// Helper interface for strict typing
interface Tip {
    type: "good" | "improve";
    tip: string;
    explanation?: string;
}

// A reusable, crash-proof section component
const DetailSection = ({ title, score, tips }: { title: string, score: number, tips: Tip[] }) => {
    // CRASH PREVENTION: If the AI didn't provide any tips for this section, hide it cleanly.
    if (!tips || tips.length === 0) return null; 

    return (
        <div className="border border-gray-200 rounded-xl mb-6 bg-white overflow-hidden shadow-sm">
            {/* Section Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">Section Score:</span>
                    <ScoreBadge score={score} />
                </div>
            </div>
            
            {/* Tips List */}
            <div className="p-0 text-left">
                <ul className="divide-y divide-gray-100">
                    {tips.map((tip, idx) => (
                        <li key={idx} className="p-4 hover:bg-gray-50 transition-colors flex gap-4">
                            <div className="mt-1 flex-shrink-0">
                                {tip.type === 'good' ? (
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-sm">✓</span>
                                ) : (
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">!</span>
                                )}
                            </div>
                            <div>
                                <h4 className={`font-semibold ${tip.type === 'good' ? 'text-green-800' : 'text-amber-800'}`}>
                                    {tip.tip}
                                </h4>
                                {tip.explanation && (
                                    <p className="text-gray-600 mt-1 text-sm">{tip.explanation}</p>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// Main Details Component
const Details = ({ feedback }: { feedback: any }) => {
    // CRASH PREVENTION: If the feedback object is entirely missing, return nothing.
    if (!feedback) return null;

    return (
        <div className="mt-8 animate-in fade-in duration-700">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Gap Analysis</h2>

            {/* CRASH PREVENTION: Using Optional Chaining (?.) and Fallbacks (|| 0) 
              ensures that if the AI hallucinates and forgets a category entirely, 
              the app passes 0 and an empty array instead of throwing a TypeError.
            */}
            <DetailSection
                title="Technical Skills Match"
                score={feedback?.skills?.score || 0}
                tips={feedback?.skills?.tips || []}
            />

            <DetailSection
                title="Experience Density (Content)"
                score={feedback?.content?.score || 0}
                tips={feedback?.content?.tips || []}
            />

            <DetailSection
                title="Information Architecture (Structure)"
                score={feedback?.structure?.score || 0}
                tips={feedback?.structure?.tips || []}
            />

            <DetailSection
                title="Communication (Tone & Style)"
                score={feedback?.toneAndStyle?.score || 0}
                tips={feedback?.toneAndStyle?.tips || []}
            />
        </div>
    );
};

export default Details;