import { useNavigate } from 'react-router-dom';
import { StatusMessage } from '../shared/components/StatusMessage';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <StatusMessage
      illustration="🐡"
      title="This page got away"
      description="Typical little fish. Let us get you back to the shop."
      actionLabel="Back to the shop"
      onAction={() => navigate('/')}
    />
  );
};

export default NotFoundPage;
