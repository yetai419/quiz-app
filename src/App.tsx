import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Toaster, toast } from "sonner";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center border-b">
        <h2 className="text-xl font-semibold accent-text">QuizAI</h2>
      </header>
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const quizzes = useQuery(api.quiz.listQuizzes);
  const generateQuiz = useAction(api.quiz.generateQuiz);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    try {
      await generateQuiz({ url });
      toast.success("Quiz generated!");
      setUrl("");
    } catch (error) {
      toast.error("Failed to generate quiz");
      console.error(error);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold accent-text mb-4">QuizAI</h1>
        <p className="text-xl text-slate-600">
          Generate quizzes from any webpage
        </p>
      </div>

      <div className="space-y-8">
        <form onSubmit={handleGenerate} className="flex gap-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a webpage URL..."
            className="flex-1 px-4 py-2 border rounded"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !url}
            className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Quiz"}
          </button>
        </form>

        {quizzes?.length === 0 && (
          <p className="text-center text-slate-600">
            No quizzes yet. Generate your first one!
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes?.map((quiz) => (
            <QuizCard key={quiz._id} quiz={quiz} />
          ))}
        </div>
      </div>
    </div>
  );
}

function QuizCard({ quiz }: { quiz: any }) {
  const [taking, setTaking] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [answers, setAnswers] = useState<number[][]>([]);
  const submitAttempt = useMutation(api.quiz.submitAttempt);

  if (taking) {
    const question = quiz.questions[currentQuestion];
    
    const handleOptionToggle = (optionIndex: number) => {
      if (question.type === "single") {
        setSelectedOptions([optionIndex]);
      } else {
        setSelectedOptions(prev => 
          prev.includes(optionIndex)
            ? prev.filter(i => i !== optionIndex)
            : [...prev, optionIndex].sort()
        );
      }
    };

    const handleSubmitAnswer = async () => {
      if (selectedOptions.length === 0) return;

      const newAnswers = [...answers, selectedOptions];
      setAnswers(newAnswers);
      setSelectedOptions([]);
      
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        await submitAttempt({ quizId: quiz._id, answers: newAnswers });
        setTaking(false);
        setCurrentQuestion(0);
        setAnswers([]);
        toast.success("Quiz completed!");
      }
    };

    return (
      <div className="p-6 border rounded-lg shadow-sm space-y-4">
        <h3 className="text-lg font-semibold">{question.question}</h3>
        <p className="text-sm text-slate-600 mb-2">
          {question.type === "multiple" ? "Select all that apply" : "Select one answer"}
        </p>
        <div className="space-y-2">
          {question.options.map((option: string, i: number) => (
            <button
              key={i}
              onClick={() => handleOptionToggle(i)}
              className={`w-full p-2 text-left border rounded hover:bg-slate-50 ${
                selectedOptions.includes(i) ? "bg-indigo-50 border-indigo-500" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 border rounded${
                  question.type === "multiple" ? "" : "-full"
                } flex items-center justify-center ${
                  selectedOptions.includes(i) ? "border-indigo-500" : ""
                }`}>
                  {selectedOptions.includes(i) && (
                    <div className={`w-2 h-2 bg-indigo-500 ${
                      question.type === "multiple" ? "" : "rounded-full"
                    }`} />
                  )}
                </div>
                {option}
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-slate-600">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </div>
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedOptions.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {currentQuestion < quiz.questions.length - 1 ? "Next" : "Finish"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg shadow-sm space-y-4">
      <h3 className="text-lg font-semibold">{quiz.title}</h3>
      <a href={quiz.url} target="_blank" rel="noopener noreferrer" 
         className="text-sm text-blue-600 hover:underline break-all">
        {quiz.url}
      </a>
      <p className="text-sm">{quiz.questions.length} questions</p>
      <button
        onClick={() => setTaking(true)}
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        Take Quiz
      </button>
    </div>
  );
}
