import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import React, { useEffect, Fragment } from "react";
import axios from "axios";
import { useState } from "react";
import { FallingLines } from "react-loader-spinner";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [ans, setAns] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [inputData, setInputData] = useState("");
  const [uri, setURI] = useState("");
  const [pdfLink, setPDFLink] = useState("")
  const [serverResponse, setServerResponse] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // const [inputQuestion, setInputQuestion] = useState('');

  const submitLink = async (event) => {
    event.preventDefault();
    setLoading(true)
    const link = {
      url: pdfLink,
    };

    try {
      const response = await axios.post('http://127.0.0.1:3001/add', link);
      const data = response.data;
      console.log('Server Response:', data);
      setServerResponse(data);
      setError(null);
      setPDFLink(''); // Clear the input box
    } catch (error) {
      console.error('Error:', error);
      // setServerResponse(null);
      setError('Server Error');
    } finally {
      setLoading(false);
    }
  };
  const handleShowForm = () => {
    setShowForm(true);
  };


  //input data button
  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      question: inputData,
      model: "gpt-3.5-turbo",
      temperature: 0,
      url: uri,
      // streaming: true
    };
    setQuestions((prevQuestions) => [...prevQuestions, inputData]);

    try {
      const response = await axios.post("http://127.0.0.1:3000/api/live", data);
      console.log(response.data);
      // setAnswer(response.data.response);
      setAnswers((prevResponses) => [...prevResponses, response.data.response]);
      setInputData("");
    } catch (error) {
      console.error(error);
    }
  };

  const submitQuestion = async (e) => {
    e.preventDefault();
    setLoading(true)

    const data = {
      question: inputData,
    };
    setQuestions((prevQuestions) => [...prevQuestions, inputData]);
    setInputData("");


    try {
      const response = await axios.post("http://127.0.0.1:3001/question", data);
      console.log(response.data);
      // setAnswer(response.data.response);
      setAnswers((prevResponses) => [...prevResponses, response.data.response]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className={styles.container}>
      <Head>
        <title>new ai app</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* section for api key for external users. */}
      <div className={styles.mainform}>
        <div className="mt-5">
        </div>
        {/* <form className={styles.mainform}>
          <input
            className={styles.textarea}
            rows="1"
            maxLength="512"
            id="userInput"
            name="apikey"
            type="password"
            placeholder="INSERT OPEN AI API KEY"
          // className="Home_textarea__lSHf7"
          // value={inputData}
          // onChange={(e) => setInputData(e.target.value)}
          >
          </input>
          <button className={styles.textarea} onClick={HealthCheckButton}>
            Submit API Key
          </button>
        </form> */}
        {!showForm ? (
          <button className={styles.textarea} onClick={handleShowForm}>Submit new PDF file</button>
        ) : (
          <form className={styles.mainform} onSubmit={submitLink}>
            <textarea
              className={styles.textarea}
              rows="1"
              maxLength="512"
              id="userInput"
              name="userInput"
              placeholder="Insert pdf link here..."
              required
              value={pdfLink}
              onChange={(e) => setPDFLink(e.target.value)}
            >
            </textarea>
            <button type="submit" className={styles.textarea}>
              Submit URL
            </button>
          </form>
        )}



      </div>
      <div className={styles.box2}>
        <div className={styles.response}>
          <div className={styles.convo_body}>

            <div className={styles.main_container}>
              <div className='text-center'>
                <p>Ask me anything! 👨🏽‍💻</p>
              </div>
              {questions.map((question, index) => (
                <Fragment key={index}>
                  <div className={styles.questions_container}>
                    <div className={styles.questions_body}>
                      {/* <Image
                        className={styles.icon}
                        src="/usericon.webp"
                        width={32}
                        height={32}
                        alt="user"
                      /> */}
                      <div className=" mr-4">
                        😎
                      </div>
                      <p className={styles.response_text}>{question}</p>
                    </div>
                  </div>

                  <div className={styles.response_container}>
                    {answers.length > index && (
                      <div className={styles.questions_body}>
                        {/* <Image
                          className={styles.icon}
                          src="/usericon.webp"
                          width={32}
                          height={32}
                          alt="user"
                        /> */}
                        <div className=" mr-4"ß>

                          🤖
                        </div>
                        <p className={styles.response_text}>{answers[index]}</p>
                      </div>
                    )}
                  </div>
                </Fragment>
              ))}
            </div>

            {/* </div> */}
          </div>
        </div>

        <div className={styles.form}>
          <form className={styles.mainform} onSubmit={submitQuestion}>
            <input
              className={styles.textarea}
              rows="1"
              maxLength="512"
              id="userInput"
              name="userInput"
              placeholder="Type your question..."
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
            />
            <br />
            {loading ? <div className={`inline-grid justify-center cursor-not-allowed ${styles.textarea}`}>
              <FallingLines
                color="white"
                width="30"
                visible={true}
                ariaLabel='falling-lines-loading'

              /> </div> :
              <button type="submit" className={styles.textarea}>
                <p>Go!</p>
              </button>}

          </form>
        </div>
      </div>
    </div>
  );
}
