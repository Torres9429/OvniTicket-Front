import './App.css';
import NavBar from './components/NavBar';
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
