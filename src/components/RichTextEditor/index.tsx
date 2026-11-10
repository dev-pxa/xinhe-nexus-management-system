import { Button, Space } from 'antd';
import { useEffect, useRef } from 'react';
import './index.less';

type RichTextEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
};

/** 轻量审批富文本编辑器，仅提供业务所需的基础排版能力。 */
export function RichTextEditor({
  value = '',
  onChange,
  disabled = false,
  placeholder = '请输入内容',
  ariaLabel = '富文本内容',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && document.activeElement !== editor && editor.innerHTML !== value) {
      editor.innerHTML = value;
    }
  }, [value]);

  const execute = (command: string, argument?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    onChange?.(editorRef.current?.innerHTML || '');
  };

  const tool = (label: string, command: string, argument?: string) => (
    <Button
      size="small"
      aria-label={label}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        execute(command, argument);
      }}
    >
      {label}
    </Button>
  );

  return (
    <div
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: 6,
        overflow: 'hidden',
        background: disabled ? '#f5f5f5' : '#fff',
      }}
    >
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa',
        }}
      >
        <Space size={4} wrap>
          {tool('加粗', 'bold')}
          {tool('斜体', 'italic')}
          {tool('下划线', 'underline')}
          {tool('无序列表', 'insertUnorderedList')}
          {tool('有序列表', 'insertOrderedList')}
          {tool('引用', 'formatBlock', 'blockquote')}
          {tool('清除格式', 'removeFormat')}
        </Space>
      </div>
      <div
        ref={editorRef}
        className="rich-text-editor-input"
        contentEditable={!disabled}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={(event) => onChange?.(event.currentTarget.innerHTML)}
        style={{
          minHeight: 120,
          maxHeight: 280,
          overflowY: 'auto',
          padding: '10px 12px',
          outline: 'none',
          lineHeight: 1.7,
          whiteSpace: 'normal',
        }}
      />
    </div>
  );
}

/** 内容只渲染后端 allow-list 净化后返回的 HTML。 */
export function RichTextContent({ html }: { html?: string | null }) {
  if (!html) return <>—</>;
  return (
    <div
      style={{ lineHeight: 1.7 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
