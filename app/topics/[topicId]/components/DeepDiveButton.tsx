'use client';

interface DeepDiveButtonProps {
  topicId: string;
  topicName: string;
}

export default function DeepDiveButton({ topicId, topicName }: DeepDiveButtonProps) {
  const handleClick = () => {
    alert(`AI Deep Dive feature coming soon for ${topicName}!`);
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
      Deep Dive with AI
    </button>
  );
}

// Made with Bob
