
import { FixedSizeList as List } from "react-window";

export default function MessageList({ messages }) {
  const Row = ({ index, style }) => (
    <div style={style} className="px-2 py-1 border-b">
      {messages[index].text}
    </div>
  );

  return (
    <List
      height={400}
      itemCount={messages.length}
      itemSize={40}
      width={"100%"}
    >
      {Row}
    </List>
  );
}
