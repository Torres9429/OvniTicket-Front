import './App.css';
import NavBar from './components/NavBar';
import PayloadCryptoLab from './components/PayloadCryptoLab';
import UserHome from './pages/User/UserHome';

function App() {
  return (
    <>
      <NavBar userName="Usuario" />
      <UserHome />
    </>
  );
}

export default App;
