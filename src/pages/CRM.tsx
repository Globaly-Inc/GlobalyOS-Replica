import { Navigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';

const CRM = () => {
  const { orgCode } = useParams<{ orgCode: string }>();
  return <Navigate to={`/org/${orgCode}/crm/contacts`} replace />;
};

export default CRM;
