import { useEffect, useState } from 'react';
import Navbar from '~/components/Navbar';
import { usePuterStore } from '~/lib/puter';
import { Link, useSearchParams } from 'react-router';

// Define the shape of our data based on what Upload.tsx saves
interface CandidateData {
    id: string;
    batchId?: string;
    candidateName?: string;
    jobTitle: string;
    resumePath: string;
    feedback: {
        overallScore: number;
        [key: string]: any; // Catch the rest of the ATS/Structure data
    } | null;
}

const Dashboard = () => {
    const { kv, puterReady } = usePuterStore();
    const [candidates, setCandidates] = useState<CandidateData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // 1. Grab the batch ID from the URL (e.g., ?batch=12345)
    const [searchParams] = useSearchParams();
    const activeBatchId = searchParams.get('batch');

    useEffect(() => {
        const fetchCandidates = async () => {
            if (!puterReady) return;
            setIsLoading(true);
            
            try {
                const keys = await kv.list('resume:*');
                if (!keys || keys.length === 0) {
                    setCandidates([]);
                    setIsLoading(false);
                    return;
                }

                const rawDataPromises = (keys as string[]).map(key => kv.get(key));
                const rawResults = await Promise.all(rawDataPromises);

                let parsedCandidates: CandidateData[] = rawResults
                    .filter(Boolean)
                    .map(result => {
                        try { return JSON.parse(result as string); } 
                        catch (e) { return null; }
                    })
                    .filter(candidate => candidate && candidate.id);

                // 2. FILTER BY BATCH ID (If one exists in the URL)
                if (activeBatchId) {
                    parsedCandidates = parsedCandidates.filter(
                        candidate => candidate.batchId === activeBatchId
                    );
                }

                // 3. Rank the filtered candidates
                const rankedCandidates = parsedCandidates.sort((a, b) => {
                    const scoreA = a.feedback?.overallScore || 0;
                    const scoreB = b.feedback?.overallScore || 0;
                    return scoreB - scoreA; 
                });

                setCandidates(rankedCandidates);
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCandidates();
    }, [kv, puterReady, activeBatchId]); // Add activeBatchId to dependencies

    // Helper function to color-code HR decisions
    const getScoreBadge = (score: number) => {
        if (score >= 85) return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">Top Tier ({score})</span>;
        if (score >= 70) return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">Strong ({score})</span>;
        if (score >= 50) return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">Marginal ({score})</span>;
        return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full">Reject ({score})</span>;
    };

    return (
        <main className="bg-gray-50 min-h-screen">
            <Navbar />

            <section className="container mx-auto px-4 py-12">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Operations Dashboard</h1>
                        <p className="text-gray-600 mt-1">Review and shortlist ranked candidates</p>
                    </div>
                    <Link to="/upload" className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition">
                        + New Batch Analysis
                    </Link>
                </div>

                {isLoading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading candidate rankings...</p>
                    </div>
                ) : candidates.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                        <img src="/icons/info.svg" alt="Empty" className="w-16 h-16 mx-auto mb-4 opacity-40" />
                        <h3 className="text-xl font-medium text-gray-900">No candidates found</h3>
                        <p className="text-gray-500 mt-2">Upload some CVs to run your first gap analysis.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rank</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Applied Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">AI Fit Score</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {candidates.map((candidate, index) => {
                                    const score = candidate.feedback?.overallScore || 0;
                                    const isError = !candidate.feedback;

                                    return (
                                        <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-lg font-bold ${index < 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                                                    #{index + 1}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">
                                                    <div className="font-medium text-gray-900">
                                                        {candidate.candidateName || `Candidate_${candidate.id ? candidate.id.substring(0,4) : 'Unknown'}`}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {candidate.jobTitle}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {isError ? (
                                                    <span className="text-red-500 text-sm italic">Analysis Failed</span>
                                                ) : (
                                                    getScoreBadge(score)
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link 
                                                    to={`/resume/${candidate.id}`} 
                                                    className="text-blue-600 hover:text-blue-900 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-50 transition"
                                                >
                                                    View Details
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
};

export default Dashboard;