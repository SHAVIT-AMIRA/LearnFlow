export function MessageItem({ 
  role = "assistant", 
  text 
}: { 
  role?: "user" | "assistant"; 
  text: string 
}) {
  // Handle multi-line text with proper line breaks
  const formattedText = text.split('\n').map((line, i) => (
    <span key={i}>
      {line}
      {i < text.split('\n').length - 1 && <br />}
    </span>
  ));

  // Use the roleValue to ensure we have a non-undefined value
  const roleValue = role || "assistant";

  return (
    <div className={`flex ${roleValue === "user" ? "justify-end" : "justify-start"}`}>
      <div 
        className={`max-w-[85%] px-3 py-2 rounded-lg ${
          roleValue === "user" 
            ? "bg-blue-100 text-blue-900" 
            : "bg-gray-100 text-gray-800"
        }`}
      >
        <div className="text-xs font-medium mb-1">
          {roleValue === "user" ? "You" : "LearnFlow AI"}
        </div>
        <div className="text-sm whitespace-pre-wrap">
          {formattedText}
        </div>
      </div>
    </div>
  );
}