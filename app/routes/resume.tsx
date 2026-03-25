import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => ([
    { title: 'Resumind | Candidate Audit' },
    { name: 'description', content: 'Detailed AI screening report for candidate' },
])

// Define the full shape of the data we expect from Puter KV
interface CandidateData {
    candidateName?: string;
    jobTitle?: string;
    error?: string;
    feedback: Feedback | null;
}

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [candidateData, setCandidateData] = useState<CandidateData | null>(null);
    const [isFetching, setIsFetching] = useState(true);

    // Keep your auth guard
    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading, auth.isAuthenticated, navigate, id])

    useEffect(() => {
        const loadResume = async () => {
            setIsFetching(true);
            try {
                const resume = await kv.get(`resume:${id}`);
                if (!resume) return;

                const data = JSON.parse(resume);
                
                // Store the full candidate metadata (Name, Role, Feedback, Errors)
                setCandidateData({
                    candidateName: data.candidateName,
                    jobTitle: data.jobTitle,
                    error: data.error,
                    feedback: data.feedback
                });

                // Load the PDF Blob
                if (data.resumePath) {
                    const resumeBlob = await fs.read(data.resumePath);
                    if (resumeBlob) {
                        const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
                        setResumeUrl(URL.createObjectURL(pdfBlob));
                    }
                }

                // Load the Image Preview Blob
                if (data.imagePath) {
                    const imageBlob = await fs.read(data.imagePath);
                    if (imageBlob) {
                        setImageUrl(URL.createObjectURL(imageBlob));
                    }
                }
            } catch (error) {
                console.error("Failed to load candidate data:", error);
            } finally {
                setIsFetching(false);
            }
        }

        loadResume();
    }, [id, kv, fs]);

    return (
        <main className="!pt-0 bg-gray-50 min-h-screen">
            {/* HR Navigation */}
            <nav className="resume-nav bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10">
                <Link to="/dashboard" className="back-button inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold transition">
                    <span className="mr-2">&larr;</span> Back to Operations Dashboard
                </Link>
            </nav>

            <div className="flex flex-row w-full max-lg:flex-col-reverse max-w-7xl mx-auto mt-6 px-4 gap-8">
                
                {/* Left Column: CV Document Viewer */}
                <section className="w-1/2 max-lg:w-full h-[calc(100vh-120px)] sticky top-24 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex items-center justify-center p-4">
                    {imageUrl && resumeUrl ? (
                        <div className="animate-in fade-in duration-1000 h-full w-full">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain hover:scale-[1.02] transition-transform"
                                    title="Click to view full PDF"
                                    alt="Candidate CV"
                                />
                            </a>
                        </div>
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                            <img src="/icons/info.svg" alt="loading" className="w-12 h-12 opacity-50 mb-2" />
                            <p>Loading document preview...</p>
                        </div>
                    )}
                </section>

                {/* Right Column: AI Audit Report */}
                <section className="w-1/2 max-lg:w-full flex flex-col gap-6 pb-20">
                    
                    {/* Dynamic HR Header */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Candidate Audit Report</h2>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {candidateData?.candidateName || 'Unknown Candidate'}
                        </h1>
                        <p className="text-blue-600 font-medium mt-1">
                            Applied for: {candidateData?.jobTitle || 'Unspecified Role'}
                        </p>
                    </div>

                    {/* Content Logic */}
                    {isFetching ? (
                        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
                            <img src="/images/resume-scan-2.gif" className="w-48 mx-auto" alt="Scanning" />
                            <p className="text-gray-500 mt-4">Retrieving AI analysis...</p>
                        </div>
                    ) : !candidateData?.feedback ? (
                        /* CRASH-PROOF UI: If feedback is null, show this instead of breaking the app */
                        <div className="bg-red-50 p-8 rounded-xl border border-red-200 text-center animate-in fade-in">
                            <h3 className="text-2xl font-bold text-red-800 mb-2">Analysis Failed</h3>
                            <p className="text-red-600">The system could not complete the gap analysis for this document.</p>
                            {candidateData?.error && (
                                <div className="mt-4 p-3 bg-white text-red-800 text-sm font-mono rounded border border-red-100 text-left overflow-x-auto">
                                    Error: {candidateData.error}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* SUCCESS UI: Safely render the AI components */
                        <div className="flex flex-col gap-6 animate-in fade-in duration-1000">
                            {/* Pass the feedback object securely */}
                            <Summary feedback={candidateData.feedback} />
                            
                            {/* OPTIONAL CHAINING FIX: Notice the '?.' and '||' fallback values! */}
                            <ATS 
                                score={candidateData.feedback?.ATS?.score || 0} 
                                suggestions={candidateData.feedback?.ATS?.tips || []} 
                            />
                            
                            <Details feedback={candidateData.feedback} />
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume