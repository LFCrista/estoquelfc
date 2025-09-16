import * as React from "react";
import { cn } from "../../lib/utils";

interface PaginationProps {
  page: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, total, perPage, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 2) {
      pages.push(i);
    } else if (
      (i === page - 3 && page - 3 > 1) ||
      (i === page + 3 && page + 3 < totalPages)
    ) {
      pages.push("...");
    }
  }

  return (
    <nav className="flex gap-1 items-center justify-center mt-6 select-none">
      <button
        className={cn(
          "px-3 py-1 rounded border text-sm",
          page === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"
        )}
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        Anterior
      </button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={"ellipsis-" + idx} className="px-2 text-muted-foreground">...</span>
        ) : (
          <button
            key={p}
            className={cn(
              "px-3 py-1 rounded border text-sm",
              p === page ? "bg-amber-600 text-white border-amber-600" : "hover:bg-accent"
            )}
            onClick={() => onPageChange(Number(p))}
            disabled={p === page}
          >
            {p}
          </button>
        )
      )}
      <button
        className={cn(
          "px-3 py-1 rounded border text-sm",
          page === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"
        )}
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        Próxima
      </button>
    </nav>
  );
}
