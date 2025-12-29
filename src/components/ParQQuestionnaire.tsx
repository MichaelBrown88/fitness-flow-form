import React, { useState, useEffect } from 'react';
import { useFormContext } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface ParQQuestion {
  id: string;
  question: string;
  tooltip: string;
  conditional?: {
    showWhen: { field: string; value: string };
  };
  isNotes?: boolean;
}

const parqQuestions: ParQQuestion[] = [
  {
    id: 'parq1',
    question: 'Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?',
    tooltip: 'If yes, obtain medical clearance and follow physician guidelines before exercise.',
  },
  {
    id: 'parq2',
    question: 'Do you feel pain in your chest when you do physical activity?',
    tooltip: 'Chest pain during exercise requires medical evaluation before continuing.',
  },
  {
    id: 'parq3',
    question: 'In the past month, have you had chest pain when you were not doing physical activity?',
    tooltip: 'Chest pain at rest may indicate a serious condition; seek medical advice.',
  },
  {
    id: 'parq4',
    question: 'Do you lose your balance because of dizziness or do you ever lose consciousness?',
    tooltip: 'Dizziness or fainting may indicate cardiovascular or neurological issues.',
  },
  {
    id: 'parq5',
    question: 'Do you have a bone or joint problem that could be worsened by a change in your physical activity?',
    tooltip: 'Existing joint problems may require exercise modifications.',
  },
  {
    id: 'parq6',
    question: 'Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?',
    tooltip: 'Certain medications can affect exercise response; adjust programs accordingly.',
  },
  {
    id: 'parq7',
    question: 'Do you know of any other reason why you should not do physical activity?',
    tooltip: 'Any medical reason that makes exercise unsafe without clearance.',
  },
  // Female-specific
  {
    id: 'parq12',
    question: 'Are you currently pregnant?',
    tooltip: 'Pregnancy requires specific exercise guidelines and modifications.',
    conditional: {
      showWhen: { field: 'gender', value: 'female' }
    }
  },
  {
    id: 'parq13',
    question: 'Have you given birth in the last 6 months?',
    tooltip: 'Recent birth may require modified return-to-exercise protocols.',
    conditional: {
      showWhen: { field: 'gender', value: 'female' }
    }
  },
];

const ParQQuestionnaire: React.FC = () => {
  const { formData, updateFormData } = useFormContext();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showMedicalClearanceWarning, setShowMedicalClearanceWarning] = useState(false);

  // Filter questions based on conditional logic
  const visibleQuestions = parqQuestions.filter(question => {
    if (!question.conditional) return true;
    const { showWhen } = question.conditional;
    return formData[showWhen.field as keyof typeof formData] === showWhen.value;
  });

  // Ensure currentQuestionIndex is valid when visibleQuestions changes
  const validQuestionIndex = Math.min(currentQuestionIndex, visibleQuestions.length - 1);
  const currentQuestion = visibleQuestions[validQuestionIndex];
  const isLastQuestion = validQuestionIndex === visibleQuestions.length - 1;
  const hasAnswer = currentQuestion?.isNotes
    ? (formData[currentQuestion.id as keyof typeof formData] as string)?.trim() !== ''
    : formData[currentQuestion?.id as keyof typeof formData] !== '';

  // Check if any PAR-Q questions have been answered "yes"
  const hasMedicalConcerns = visibleQuestions.some(question =>
    formData[question.id as keyof typeof formData] === 'yes'
  );

  // Mark PAR-Q as complete when all required questions are answered
  const allQuestionsAnswered = visibleQuestions
    .every(question => formData[question.id as keyof typeof formData] !== '');

  useEffect(() => {
    // Update the parqQuestionnaire field when all questions are complete
    if (allQuestionsAnswered) {
      updateFormData({ parqQuestionnaire: 'completed' });
    }
  }, [allQuestionsAnswered, updateFormData]);

  useEffect(() => {
    // Auto-advance to next question when answered (but not for notes)
    if (hasAnswer && !isLastQuestion && !currentQuestion?.isNotes) {
      const timer = setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
      }, 500); // Small delay for visual feedback
      return () => clearTimeout(timer);
    }
  }, [hasAnswer, isLastQuestion, currentQuestion?.isNotes]);

  const handleAnswer = (answer: string) => {
    if (currentQuestion) {
      updateFormData({ [currentQuestion.id]: answer });
    }
  };

  // Update currentQuestionIndex when visibleQuestions changes
  useEffect(() => {
    if (currentQuestionIndex > validQuestionIndex) {
      setCurrentQuestionIndex(validQuestionIndex);
    }
  }, [currentQuestionIndex, validQuestionIndex]);

  const goToPrevious = () => {
    if (validQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentQuestion?.isNotes) {
      // Complete the PAR-Q when clicking "PAR-Q Complete" on notes
      updateFormData({ parqQuestionnaire: 'completed' });
    } else if (validQuestionIndex < visibleQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  if (!currentQuestion) return null;

  const currentAnswer = formData[currentQuestion.id as keyof typeof formData];

  // Show completion message when PAR-Q is completed
  if (formData.parqQuestionnaire === 'completed') {
    return (
      <div className="text-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 rounded-3xl mb-6 shadow-sm">
          <Check className="h-10 w-10 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-3">Screening Complete</h3>
        <p className="text-slate-500 font-medium max-w-sm mx-auto">Health screening requirements have been met. Proceeding to the next section.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Medical Clearance Warning */}
      {hasMedicalConcerns && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-900 mb-1">
                Medical Clearance Required
              </h3>
              <p className="text-sm text-rose-700 leading-relaxed font-medium">
                One or more responses indicate a potential health risk. Please consult a healthcare professional before starting any physical activity.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Screening Progress
          </span>
          <span className="text-xs font-bold text-primary">
            Question {currentQuestionIndex + 1} of {visibleQuestions.length}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentQuestionIndex + 1) / visibleQuestions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[320px] flex flex-col justify-center">
        <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 leading-tight">
          {currentQuestion.question}
        </h3>

        {currentQuestion.tooltip && (
          <p className="text-sm text-slate-400 mb-8 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-4">
            Note: {currentQuestion.tooltip}
          </p>
        )}

        {/* Answer options */}
        {currentQuestion.isNotes ? (
          <div className="space-y-3">
            <textarea
              placeholder="Document any additional health conditions, medications, or concerns mentioned..."
              value={(currentAnswer as string) || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              rows={4}
              className="w-full p-5 border border-slate-200 rounded-2xl resize-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-slate-700"
            />
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => handleAnswer('no')}
            className={`flex h-20 items-center justify-between px-8 rounded-2xl border-2 transition-all group ${
              currentAnswer === 'no'
                ? 'border-primary bg-brand-light text-primary shadow-md ring-1 ring-primary'
                : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white text-slate-500'
            }`}
          >
            <span className="text-xl font-bold">No</span>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
              currentAnswer === 'no' ? 'bg-primary border-primary text-white' : 'border-slate-200'
            }`}>
              {currentAnswer === 'no' && <Check className="h-5 w-5 stroke-[3]" />}
            </div>
          </button>

          <button
            onClick={() => handleAnswer('yes')}
            className={`flex h-20 items-center justify-between px-8 rounded-2xl border-2 transition-all group ${
              currentAnswer === 'yes'
                ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-md ring-1 ring-rose-500'
                : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white text-slate-500'
            }`}
          >
            <span className="text-xl font-bold">Yes</span>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
              currentAnswer === 'yes' ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-200'
            }`}>
              {currentAnswer === 'yes' && <Check className="h-5 w-5 stroke-[3]" />}
            </div>
          </button>
        </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="ghost"
          onClick={goToPrevious}
          disabled={currentQuestionIndex === 0}
          className="h-12 px-6 rounded-xl font-bold text-slate-500 hover:bg-white hover:text-slate-900 transition-all"
        >
          <ChevronLeft className="mr-2 h-5 w-5" />
          Back
        </Button>

        <div className="hidden sm:block">
          {hasAnswer && !isLastQuestion && (
            <span className="text-xs font-bold text-primary/60 animate-pulse uppercase tracking-widest">
              Auto-advancing...
            </span>
          )}
        </div>

        <Button
          onClick={goToNext}
          disabled={!hasAnswer || (isLastQuestion && !allQuestionsAnswered)}
          className={`h-12 px-8 rounded-xl font-bold shadow-lg transition-all ${
            hasAnswer ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-400 grayscale'
          }`}
        >
          {currentQuestion?.isNotes ? 'Complete Screening' : 'Next Question'}
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ParQQuestionnaire;
