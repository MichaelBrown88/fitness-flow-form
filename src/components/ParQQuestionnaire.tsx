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
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">PAR-Q Questionnaire Complete!</h3>
        <p className="text-slate-600">Your health screening is complete. Proceeding to body composition assessment...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Medical Clearance Warning */}
      {hasMedicalConcerns && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 text-red-500 mt-0.5">
              ⚠️
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-800 mb-1">
                Medical Clearance Required
              </h3>
              <p className="text-sm text-red-700">
                One or more of your answers indicate that you may need medical clearance before participating in physical activity.
                Please consult with a healthcare professional before proceeding.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            Question {currentQuestionIndex + 1} of {visibleQuestions.length}
          </span>
          <span className="text-sm text-slate-500">
            {Math.round(((currentQuestionIndex + 1) / visibleQuestions.length) * 100)}% complete
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-slate-900 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / visibleQuestions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">
          {currentQuestion.question}
        </h3>

        {currentQuestion.tooltip && (
          <p className="text-sm text-slate-600 mb-6 italic">
            {currentQuestion.tooltip}
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
              className="w-full p-4 border border-slate-200 rounded-lg resize-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>
        ) : (
        <div className="space-y-3">
          <button
            onClick={() => handleAnswer('no')}
            className={`w-full p-4 text-left border rounded-lg transition-all ${
              currentAnswer === 'no'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">No</span>
              {currentAnswer === 'no' && <Check className="h-5 w-5 text-green-600" />}
            </div>
          </button>

          <button
            onClick={() => handleAnswer('yes')}
            className={`w-full p-4 text-left border rounded-lg transition-all ${
              currentAnswer === 'yes'
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Yes</span>
              {currentAnswer === 'yes' && <Check className="h-5 w-5 text-red-600" />}
            </div>
          </button>
        </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <Button
          variant="outline"
          onClick={goToPrevious}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="text-sm text-slate-500">
          {hasAnswer ? (
            isLastQuestion ? (
              <span className="text-green-600 font-medium">Questionnaire Complete!</span>
            ) : (
              <span>Auto-advancing to next question...</span>
            )
          ) : (
            <span>Please select an answer</span>
          )}
        </div>

        <Button
          onClick={goToNext}
          disabled={!hasAnswer || (isLastQuestion && !allQuestionsAnswered)}
          className="flex items-center gap-2"
        >
          {currentQuestion?.isNotes ? 'PAR-Q Complete' : 'Next'}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ParQQuestionnaire;
