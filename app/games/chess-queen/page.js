import { ChessGame } from '../../../components/ChessGame';

export const metadata = {
  title: 'GG Chess',
  description: 'Play chess in your browser against the computer or a friend.',
};

export default function ChessPage() {
  return <ChessGame />;
}
