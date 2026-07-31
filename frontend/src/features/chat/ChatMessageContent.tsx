import type { ReactNode } from 'react';

type ChatMessageContentProps = {
  content: string;
};

function renderInline(content: string): ReactNode[] {
  return content.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={index} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

export function ChatMessageContent({ content }: ChatMessageContentProps) {
  const blocks = content.trim().split(/\n{2,}/);

  return (
    <div className="space-y-2 break-words">
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n');
        const isList = lines.every((line) => /^\s*[-•]\s+/.test(line));

        if (isList) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1 pl-5 marker:text-primary-600">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^\s*[-•]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={blockIndex} className="whitespace-pre-wrap">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}
