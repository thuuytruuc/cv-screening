import ScoreGauge from "~/components/ScoreGauge";
import ScoreBadge from "~/components/ScoreBadge";

// Make sure to export or define your Feedback interface properly in your types file
const Category = ({ title, score }: { title: string, score: number }) => {
    // HR Color Coding: 85+ Top Tier (Green), 70+ Strong (Blue), 50+ Marginal (Yellow), <50 Reject (Red)
    const textColor = score >= 85 ? 'text-green-600'
            : score >= 70 ? 'text-blue-600'
            : score >= 50 ? 'text-yellow-600'
            : 'text-red-600';

    return (
        <div className="border-t border-gray-100 p-4 hover:bg-gray-50 transition-colors">
            <div className="flex flex-row items-center justify-between">
                <div className="flex flex-row gap-3 items-center">
                    <p className="text-lg font-semibold text-gray-800">{title}</p>
                    <ScoreBadge score={score} />
                </div>
                <p className="text-xl font-bold">
                    <span className={textColor}>{score}</span>
                    <span className="text-gray-400 text-sm font-normal">/100</span>
                </p>
            </div>
        </div>
    )
}

// Using 'any' here temporarily if your Feedback interface isn't fully strict, 
// but it's highly recommended to strictly type this later!
const Summary = ({ feedback }: { feedback: any }) => {
    
    // THE FIX: Safe extraction. If a category is missing, it safely defaults to 0 instead of crashing.
    const overallScore = feedback?.overallScore || 0;
    const skillsScore = feedback?.skills?.score || 0;
    const contentScore = feedback?.content?.score || 0;
    const toneScore = feedback?.toneAndStyle?.score || 0;
    const structureScore = feedback?.structure?.score || 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full overflow-hidden">
            {/* Header Section */}
            <div className="flex flex-row items-center p-6 gap-6 bg-gray-50">
                <div className="w-24 h-24 flex-shrink-0">
                    <ScoreGauge score={overallScore} />
                </div>

                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-gray-900">Executive Fit Summary</h2>
                    <p className="text-sm text-gray-600">
                        Weighted assessment of candidate capabilities against the target Job Description.
                    </p>
                </div>
            </div>

            {/* Categories Section - Renamed for HR Context */}
            <div className="flex flex-col">
                <Category title="Technical Skills Match" score={skillsScore} />
                <Category title="Experience Density (Content)" score={contentScore} />
                <Category title="Communication (Tone & Style)" score={toneScore} />
                <Category title="Information Architecture (Structure)" score={structureScore} />
            </div>
        </div>
    )
}

export default Summary