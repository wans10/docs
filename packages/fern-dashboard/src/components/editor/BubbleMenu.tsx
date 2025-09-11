import { MouseEventHandler } from "react";

import { useCurrentEditor } from "@tiptap/react";
import { BubbleMenu as EditorBubbleMenu } from "@tiptap/react/menus";

import { Icon } from "@/components/icon/Icon";

type BubbleMenuAction =
  | "setNodeType"
  | "toggleBold"
  | "toggleItalic"
  | "toggleUnderline"
  | "toggleStrike"
  | "setLink"
  | "toggleCode"
  | "toggleBulletList"
  | "toggleOrderedList";

export default function BubbleMenu() {
  const { editor } = useCurrentEditor();

  function menuItemClickHandler(action: BubbleMenuAction) {
    return () => {
      if (!editor) return;

      switch (action) {
        case "setNodeType":
          // TODO: This should open an additional popover to select the heading level
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case "toggleBold":
          editor.chain().focus().toggleBold().run();
          break;
        case "toggleItalic":
          editor.chain().focus().toggleItalic().run();
          break;
        case "toggleUnderline":
          editor.chain().focus().toggleUnderline().run();
          break;
        case "toggleStrike":
          editor.chain().focus().toggleStrike().run();
          break;
        case "setLink":
          // TODO: This should open an additional popover to edit the link
          editor
            .chain()
            .focus()
            .setLink({ href: "https://www.google.com" })
            .run();
          break;
        case "toggleCode":
          editor.chain().focus().toggleCode().run();
          break;
        case "toggleBulletList":
          editor.chain().focus().toggleBulletList().run();
          break;
        case "toggleOrderedList":
          editor.chain().focus().toggleOrderedList().run();
          break;
      }
    };
  }

  return (
    <EditorBubbleMenu
      options={{ placement: "top-start" }}
      shouldShow={({ editor, state }) => {
        const { selection } = state;

        // Check if we have an active selection
        return editor.isFocused && !selection.empty;
      }}
    >
      <div className="border-1 text-gray-1100 flex items-center gap-px border-gray-500 bg-white p-2 shadow-sm">
        <BubbleMenuItem
          iconProps={{ variant: "Heading1" }}
          onClick={menuItemClickHandler("setNodeType")}
        />
        <BubbleMenuSeparator />
        <BubbleMenuItem
          iconProps={{ variant: "Bold" }}
          onClick={menuItemClickHandler("toggleBold")}
        />
        <BubbleMenuItem
          iconProps={{ variant: "Italic" }}
          onClick={menuItemClickHandler("toggleItalic")}
        />
        <BubbleMenuItem
          iconProps={{ variant: "Underline" }}
          onClick={menuItemClickHandler("toggleUnderline")}
        />
        <BubbleMenuItem
          iconProps={{ variant: "Strikethrough" }}
          onClick={menuItemClickHandler("toggleStrike")}
        />
        <BubbleMenuItem
          iconProps={{ variant: "Link" }}
          onClick={menuItemClickHandler("setLink")}
        />
        <BubbleMenuItem
          iconProps={{ variant: "Code" }}
          onClick={menuItemClickHandler("toggleCode")}
        />
        <BubbleMenuSeparator />
        <BubbleMenuItem
          iconProps={{ variant: "List" }}
          onClick={menuItemClickHandler("toggleBulletList")}
        />
        <BubbleMenuItem
          iconProps={{ variant: "ListOrdered" }}
          onClick={menuItemClickHandler("toggleOrderedList")}
        />
      </div>
    </EditorBubbleMenu>
  );
}

declare namespace BubbleMenuItem {
  export interface Props {
    iconProps: Icon.Props;
    onClick?: MouseEventHandler<HTMLButtonElement>;
  }
}

function BubbleMenuItem({ iconProps, onClick }: BubbleMenuItem.Props) {
  const { size = 20, ...restIconProps } = iconProps;

  return (
    <button className="cursor-pointer hover:bg-gray-300" onClick={onClick}>
      <div className="flex size-6 items-center justify-center">
        <Icon size={size} {...restIconProps} />
      </div>
    </button>
  );
}

function BubbleMenuSeparator() {
  return (
    <div className="flex h-6 w-1.5 items-center justify-center">
      <div className="h-5 w-px bg-gray-300" />
    </div>
  );
}
