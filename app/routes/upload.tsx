import { type FormEvent, useState } from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "../../constants";

type SkillEntry = { skill: string; weight: number };

const Upload = () => {
    const { fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    // 1. Update state to handle an array of files
    const [files, setFiles] = useState<File[]>([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    // Skill + weight list state
    const [skills, setSkills] = useState<SkillEntry[]>([
        { skill: '', weight: 5 },
    ]);

    const addSkill = () => setSkills(prev => [...prev, { skill: '', weight: 5 }]);

    const removeSkill = (index: number) =>
        setSkills(prev => prev.filter((_, i) => i !== index));

    const updateSkill = (index: number, field: keyof SkillEntry, value: string | number) =>
        setSkills(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));

    const buildJobDescription = () => {
        const filled = skills.filter(s => s.skill.trim());
        if (filled.length === 0) return '';
        const lines = filled.map(s => `- ${s.skill.trim()} (weight: ${s.weight}/10)`);
        return `Key required skills (weighted by importance):\n${lines.join('\n')}`;
    };

    // 2. Expect an array of files from the uploader
    const handleFileSelect = (selectedFiles: File[]) => {
        setFiles(selectedFiles);
    }

    const handleAnalyzeBatch = async ({ jobTitle, jobDescription, targetCount, filesToProcess }: { jobTitle: string, jobDescription: string, targetCount: number, filesToProcess: File[] }) => {
        setIsProcessing(true);
        setProgress({ current: 0, total: filesToProcess.length });
        
        // Generate a unique ID for this entire recruitment drive
        const batchId = generateUUID();
        const processedCandidates = [];

        // 3. Process files sequentially to respect AI rate limits
        for (let i = 0; i < filesToProcess.length; i++) {
            const currentFile = filesToProcess[i];
            setProgress({ current: i + 1, total: filesToProcess.length });
            
            try {
                setStatusText(`[${i + 1}/${filesToProcess.length}] Uploading ${currentFile.name}...`);
                const uploadedFile = await fs.upload([currentFile]);
                if (!uploadedFile) throw new Error('Failed to upload PDF');
                setStatusText(`[${i + 1}/${filesToProcess.length}] Converting to image preview...`);
                const imageFile = await convertPdfToImage(currentFile);
                if (imageFile.error || !imageFile.file) throw new Error(imageFile.error || 'Conversion failed');
               
                const uploadedImage = await fs.upload([imageFile.file]);
                if (!uploadedImage) throw new Error('Failed to upload image preview');

                setStatusText(`[${i + 1}/${filesToProcess.length}] Extracting CV text...`);
                const extractedText = await ai.img2txt(imageFile.file);                

                setStatusText(`[${i + 1}/${filesToProcess.length}] AI is analyzing candidate...`);
                const uuid = generateUUID();
                const data = {
                    id: uuid,
                    batchId: batchId, // Link this resume to the batch
                    candidateName: currentFile.name.replace('.pdf', ''), // Fallback name
                    resumePath: uploadedFile.path,
                    imagePath: uploadedImage.path,
                    jobTitle, 
                    jobDescription,
                    feedback: null as any,
                };

                const feedback = await ai.feedback(
                    uploadedFile.path,
                    prepareInstructions({ 
                        jobTitle, 
                        jobDescription, 
                        cvText: extractedText || "No text could be extracted." // Pass the text to the prompt!
                    })
                );

                if (!feedback) throw new Error('AI returned no response');

                const feedbackText = typeof feedback.message.content === 'string'
                    ? feedback.message.content
                    : feedback.message.content[0].text;

                const cleanJsonText = feedbackText
                    .replace(/```json/g, "") 
                    .replace(/```/g, "")     
                    .trim();                 

                data.feedback = JSON.parse(cleanJsonText);
                
                // Save this specific candidate
                await kv.set(`resume:${uuid}`, JSON.stringify(data));
                processedCandidates.push(uuid);

            } catch (err) {
                console.error(`Error processing ${currentFile.name}:`, err);
                // We don't return here so the loop continues to the next candidate!
            }
        }

        setStatusText('Batch analysis complete! Redirecting to dashboard...');
        
        // Save the batch metadata (useful for the HR Dashboard)
        await kv.set(`batch:${batchId}`, JSON.stringify({
            jobTitle,
            targetCount,
            candidates: processedCandidates,
            date: new Date().toISOString()
        }));

        // 4. Redirect to a dashboard or batch results page instead of a single resume
        navigate(`/dashboard?batch=${batchId}`);
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if (!form) return;
        const formData = new FormData(form);

        const jobTitle = formData.get('job-title') as string;
        const jobDescription = buildJobDescription();
        const targetCount = parseInt(formData.get('passed-candidates') as string, 10);

        if (files.length === 0) return alert("Please upload at least one CV.");
        if (!jobDescription) return alert("Please add at least one skill.");

        handleAnalyzeBatch({ jobTitle, jobDescription, targetCount, filesToProcess: files });
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <Navbar />

            <section className="main-section container mx-auto px-4">
                <div className="page-heading py-16 text-center">
                    {/* HR-focused branding */}
                    <h1 className="text-4xl font-bold mb-4">AI Candidate Screening</h1>
                    
                    {isProcessing ? (
                        <div className="flex flex-col items-center mt-8">
                            <h2 className="text-xl font-semibold mb-2">{statusText}</h2>
                            <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mb-4">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                            </div>
                            <img src="/images/resume-scan.gif" className="w-64 mt-4 rounded-lg shadow-lg" alt="Scanning" />
                        </div>
                    ) : (
                        <h2 className="text-lg text-gray-600 mb-8">Automate gap analysis and shortlist your top candidates</h2>
                    )}
                    
                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-6 mt-8 max-w-2xl mx-auto text-left bg-white p-8 rounded-xl shadow-sm">
                            <div className="form-div">
                                <label htmlFor="job-title" className="font-semibold">Job Title</label>
                                <input type="text" name="job-title" placeholder="e.g. Senior Frontend Engineer" id="job-title" required className="border p-2 rounded" />
                            </div>
                            
                            <div className="form-div">
                                <label className="font-semibold">Required Skills &amp; Weights</label>
                                <p className="text-sm text-gray-500 -mt-1">
                                    List each skill the role needs and rate its importance from 1 (nice-to-have) to 10 (must-have).
                                </p>

                                <div className="flex flex-col gap-3 w-full">
                                    {skills.map((entry, idx) => (
                                        <div key={idx} className="flex items-center gap-3 w-full animate-[fadeIn_0.2s_ease]">
                                            {/* Skill input */}
                                            <input
                                                type="text"
                                                value={entry.skill}
                                                onChange={e => updateSkill(idx, 'skill', e.target.value)}
                                                placeholder={`Skill #${idx + 1}  e.g. React, Python…`}
                                                className="flex-1 min-w-0"
                                            />

                                            {/* Weight badge + slider */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs font-semibold text-indigo-600 w-6 text-center">
                                                    {entry.weight}
                                                </span>
                                                <input
                                                    type="range"
                                                    min={1}
                                                    max={10}
                                                    value={entry.weight}
                                                    onChange={e => updateSkill(idx, 'weight', parseInt(e.target.value))}
                                                    className="w-24 accent-indigo-500 cursor-pointer"
                                                    style={{ boxShadow: 'none', padding: 0, backdropFilter: 'none' }}
                                                    title={`Weight: ${entry.weight}/10`}
                                                />
                                            </div>

                                            {/* Remove button (hidden when only 1 row) */}
                                            {skills.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeSkill(idx)}
                                                    className="shrink-0 text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                                                    title="Remove skill"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Add skill button */}
                                <button
                                    type="button"
                                    onClick={addSkill}
                                    className="mt-1 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                                >
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 hover:bg-indigo-200 text-lg font-bold leading-none transition-colors">
                                        +
                                    </span>
                                    Add skill
                                </button>
                            </div>

                            <div className="form-div">
                                <label htmlFor="passed-candidates" className="font-semibold">Target Shortlist Size</label>
                                <input type="number" name="passed-candidates" min="1" placeholder="How many candidates do you want to pass?" id="passed-candidates" required className="border p-2 rounded" />
                                <span className="text-sm text-gray-500 mt-1">The AI will rank the batch to find the top candidates.</span>
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader" className="font-semibold">Upload Candidate Resumes (PDF)</label>
                                {/* Make sure your FileUploader component accepts the 'multiple' prop! */}
                                <FileUploader onFileSelect={handleFileSelect} multiple={true} />
                                <span className="text-sm text-gray-500 mt-1">{files.length} file(s) selected</span>
                            </div>

                            <button className="bg-blue-600 text-white font-bold py-3 px-6 rounded hover:bg-blue-700 transition-colors" type="submit">
                                Run Gap Analysis
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}
export default Upload