type QuizItem = {
  id: string;
  question_count: number;
  question_types: string[];
  created_at: string;
};

type QuizListProps = {
  quizzes: QuizItem[];
};

export function QuizList({ quizzes }: QuizListProps) {
  if (!quizzes.length) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">No quizzes yet. Create one to get started.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h2 className="text-xl font-semibold text-foreground">Your Quizzes</h2>
      <ul className="space-y-2">
        {quizzes.map((quiz) => (
          <li key={quiz.id} className="rounded-xl border border-border p-3">
            <a className="font-medium text-foreground underline" href={`/quizzes/${quiz.id}`}>
              Quiz {quiz.id.slice(0, 8)}
            </a>
            <p className="text-sm text-muted-foreground">
              {quiz.question_count} questions • {quiz.question_types.join(", ") || "mixed"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
