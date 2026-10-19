import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

// react-markdown no renderiza HTML crudo por defecto: el contenido no puede inyectar scripts.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
