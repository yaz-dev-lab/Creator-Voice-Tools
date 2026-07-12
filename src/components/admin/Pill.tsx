export default function Pill({
  color,
  children,
}: {
  color: 'green' | 'yellow' | 'red' | 'gray' | 'purple';
  children: React.ReactNode;
}) {
  return <span className={`pill pill-${color}`}>{children}</span>;
}
