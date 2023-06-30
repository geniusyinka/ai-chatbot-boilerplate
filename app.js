import express from 'express'
import http from 'http'
import axios from 'axios'
import crypto from 'crypto'
import * as fs from 'fs/promises'

import { createWriteStream } from 'fs'
import { parse as parseUrl } from 'url'
import { join, extname, basename } from 'path'

/* Open AI | LLM*/
import { OpenAI } from 'langchain/llms/openai'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts"; 
import { LLMChain, VectorDBQAChain  } from 'langchain/chains'

/* Parsers */
import { WebBrowser } from 'langchain/tools/webbrowser'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'
import { UnstructuredLoader } from 'langchain/document_loaders/fs/unstructured'
import { Document } from 'langchain/document'
// import SitemapXMLParser from 'sitemap-xml-parser'

/* Tools */
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

/* Vector store */
import { FaissStore } from "langchain/vectorstores/faiss";

import cors from "cors";


/* Load environment variables from .env file */
import * as dotenv from 'dotenv'
dotenv.config()

const app = express()

const port = 3001;

/* Create HTTP server */
http.createServer(app).listen(process.env.PORT)
console.info('listening on port ' + process.env.PORT)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
/* Middleware to parse JSON request bodies */
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(
  cors({
    origin: "http://127.0.0.1:3000",
    credentials: true
  })
)



app.get('/health', async (req, res) => {
  res.json({
    success: true,
    message: 'server is gtg!',
  })
})

// from load
app.post('/add', async (req, res) => {
  let {
    // url = "https://web-archive.southampton.ac.uk/cogprints.org/7150/1/10.1.1.83.5248.pdf",
    url,
    // filter,
    // limit,
    chunkSize = 2000,
    chunkOverlap = 250,
    sleep = 0,
  } = req.body
  //  url = "https://www.ifsw.org/wp-content/uploads/2022/05/IFSW-Position-to-which-you-seek-nomin-AutoRecovered-1-1.pdf"
  // const chunkSize = 2000
  // const chunkOverlap = 250

  const downloadDir = process.env.DIR || 'docs'

  if (!url) {
    res.json({ message: 'Missing URL' })
    return
  }

  // let encodedCollection = await sanitize(collection)
  let type = getFileType(url)

  if (type === 'PDF') {
    try {
      const filename = getUrlFilename(url)
      if (!filename) {
        res.status(400).json({ message: 'The provided URL is not a PDF file.' })
        return
      }
      const filePath = await fetchAndSaveFile(url, filename, downloadDir)

      const loader = new PDFLoader(filePath, {
        splitPages: true,
      })
      const docs = await loader.load()

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: chunkSize,
        chunkOverlap: chunkOverlap,
      })

      const docOutput = await textSplitter.splitDocuments(docs)
      let vectorStore = await FaissStore.fromDocuments(
        docOutput,
        new OpenAIEmbeddings(),
      )
      // vectorStore = null
      const directory = "/Users/yinka/Documents/art/ai-chatbot-boilerplate/";
      await vectorStore.save(directory);
      console.log('saved!')

      console.log('✔ Added!')
      // Return the response to the user
      res.json({ response: 'added' })
    } catch (err) {
      console.error(err)
      res.json({ message: 'Error processing the PDF' })
      console.log('Error processing the PDF')
    }
  } else (
    console.log('null!')
  )
})
// end

// app.post('/add', async (req, res) => {
//     const {
//       url,
//       filter,
//       limit,
//       chunkSize = 2000,
//       chunkOverlap = 250,
//       sleep = 0,
//     } = req.body

//     const downloadDir = process.env.DOCS_DIRECTORY || 'docs'

//     if (!url) {
//       res.status(500).json({ message: 'Missing URL' })
//       return
//     }

//     let encodedCollection = await sanitize(collection)
//     let type = getFileType(url)

//     if (type === 'URL' || type === 'HTML') {
//       try {
//         await addURL(url, encodedCollection, chunkSize, chunkOverlap)
//         // Return the response to the user
//         res.json({ response: 'added', collection: collection })
//       } catch (err) {
//         console.error(err)
//         res.status(500).json({ message: 'Error processing the request' })
//       }
//     } else if (type === 'SITEMAP') {
//       try {
//         const sitemap = await parseSitmap(url, filter, limit)

//         const asyncFunction = async (item) => {
//           console.log('\nAdding >>', item)
//           await addURL(item, encodedCollection, chunkSize, chunkOverlap)
//         }

//         const iterateAndRunAsync = async (array) => {
//           for (const item of array) {
//             await asyncFunction(item)
//             await sleepWait(sleep)
//           }
//         }

//         iterateAndRunAsync(sitemap).then(async () => {
//           console.log('\nDone! | Collection:', collection)

//           // Return the response to the user
//           res.json({ response: 'started', collection: collection })
//         })
//       } catch (err) {
//         console.error(err)
//         res.status(500).json({ message: 'Error processing the sitemap' })
//       }
//     } else if (type === 'PDF') {
//       try {
//         const filename = getUrlFilename(url)
//         if (!filename) {
//           res.status(400).json({ message: 'The provided URL is not a PDF file.' })
//           return
//         }
//         const filePath = await fetchAndSaveFile(url, filename, downloadDir)

//         const loader = new PDFLoader(filePath, {
//           splitPages: true,
//         })
//         const docs = await loader.load()

//         const textSplitter = new RecursiveCharacterTextSplitter({
//           chunkSize: chunkSize,
//           chunkOverlap: chunkOverlap,
//         })

//         const docOutput = await textSplitter.splitDocuments(docs)

//         /* Clean metadata for OpenSearch */
//         docOutput.forEach((document) => {
//           document.metadata.source = basename(document.metadata.source)
//           delete document.metadata.pdf
//           delete document.metadata.loc
//         })

//         let vectorStore = await OpenSearchVectorStore.fromDocuments(
//           docOutput,
//           new OpenAIEmbeddings(),
//           {
//             client,
//             indexName: encodedCollection,
//           }
//         )
//         vectorStore = null
//         console.log('✔ Added!')
//         // Return the response to the user
//         res.json({ response: 'added', collection: collection })
//       } catch (err) {
//         console.error(err)
//         res.status(500).json({ message: 'Error processing the PDF' })
//       }
//     } else if (type === 'UNSTRUCTURED') {
//       try {
//         // Check if the URL points to a file and extract the filename with the extension.
//         const filename = getUrlFilename(url)

//         if (!filename) {
//           res.status(400).json({ message: 'The provided URL is not a file URL.' })
//           return
//         }

//         const filePath = await fetchAndSaveFile(url, filename, downloadDir)

//         const loader = new UnstructuredLoader(
//           `${process.env.UNSTRUCTURED_URL}/general/v0/general`,
//           filePath
//         )

//         const docs = await loader.load()

//         const textSplitter = new RecursiveCharacterTextSplitter({
//           chunkSize: chunkSize,
//           chunkOverlap: chunkOverlap,
//         })

//         const docOutput = await textSplitter.splitDocuments(docs)

//         /* Clean metadata for OpenSearch */
//         docOutput.forEach((document) => {
//           document.metadata.source = document.metadata.filename
//           delete document.metadata.filename
//           delete document.metadata.category
//           delete document.metadata.loc
//         })

//         // Create a new document for the URL
//         let vectorStore = await OpenSearchVectorStore.fromDocuments(
//           docOutput,
//           new OpenAIEmbeddings(),
//           {
//             client,
//             indexName: encodedCollection,
//           }
//         )
//         vectorStore = null
//         console.log('Added!')
//         // Return the response to the user
//         res.json({ response: 'added', collection: collection })
//       } catch (err) {
//         console.error(err)
//         res.status(500).json({ message: 'Error processing the file.' })
//       }
//     }
//   })

/* Get a response using the vector store */
app.post('/question', async (req, res) => {
  const {
    question,
    model = 'gpt-3.5-turbo',
    k = 3,
    temperature = 0,
    max_tokens = 400,
    streaming = true,
    // apiKey
  } = req.body


  const llm = new OpenAI({
    modelName: model,
    concurrency: 15,
    //maxConcurrency: 5,
    //timeout: 10000,
    // cache,
    temperature: temperature,
    streaming: streaming,
    // openAIApiKey: apiKey
  })





  let vectorStore
  const directory = process.env.DIR //saved directory in .env file

  try {
    vectorStore = await FaissStore.load(
      directory,
      new OpenAIEmbeddings()
    );
  } catch (err) {
    vectorStore = null
    console.log('vector store error!')
  }

  try {
    if (vectorStore) {
      const template =
      "Your are a helpful AI Assistant whose name is Yinka."
    const prompt = new PromptTemplate({
      template: template,
      inputVariables: ['question'],
    })
      console.log('Using Vector Store')

      const chain = VectorDBQAChain.fromLLM(llm, vectorStore, prompt, {
        k: k,
        returnSourceDocuments: true,
      })
      const chainb = new LLMChain({ llm: llm, prompt: prompt })

      const response = await chain.call({
        query: question,
        
      })


      // Get the sources from the response
      // let sources = response.sourceDocuments
      // sources = sources.map((sources) => sources.metadata.source)
      // // Remove duplicates
      // sources = [...new Set(sources)]

      //new code
      let sources = response.sourceDocuments;
      if (Array.isArray(sources)) {
        sources = sources.map((source) => source.metadata.source);
        // Remove duplicates
        sources = [...new Set(sources)];
      } else {
        sources = [];
      }

      console.log('Sources:', sources)
      vectorStore = null

      // Return the response to the user
      res.json({ response: response.text, sources })
    } else {
      console.log('No vector store found.')
      // We don't have a vector store yet, so we'll just use a template
      const template =
        "Your are a helpful AI Assistant. Try to answer the following question: {question} If you don't know the answer, just say \"Hmm, I'm not sure.\" Don't try to make up an answer."
      const prompt = new PromptTemplate({
        template: template,
        inputVariables: ['question'],
      })
      const chain = new LLMChain({ llm: llm, prompt: prompt })
      const response = await chain.call({ question: question })

      // Return the response to the user
      res.json({ response: cleanText(response.text) })
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error processing the request' })
  }
})





function getUrlFilename(url) {
  const parsedUrl = parseUrl(url)
  const pathname = parsedUrl.pathname
  const extension = extname(pathname)

  if (extension) {
    return basename(pathname)
  }

  return null
}

/* Get the file type from the URL */
function getFileType(url) {
  const sitemap = /sitemap\.xml$/i
  const image = /\.(jpg|jpeg|png|gif)$/i
  const pdf = /\.pdf$/i
  const powerpoint = /\.(ppt|pptx)$/i
  const text = /\.(txt|md)$/i
  const html = /\.(html|htm)$/i

  if (url.match(image)) {
    return 'UNSTRUCTURED'
  } else if (url.match(pdf)) {
    return 'PDF'
  } else if (url.match(powerpoint)) {
    return 'UNSTRUCTURED'
  } else if (url.match(text)) {
    return 'UNSTRUCTURED'
  } else if (url.match(sitemap)) {
    return 'SITEMAP'
  } else if (url.match(html)) {
    return 'HTML'
  } else {
    return 'URL'
  }
}

/* Download a file before adding to Faiss */
async function fetchAndSaveFile(url, filename, downloadDir) {
  /* Ensure the directory exists */
  try {
    await fs.access(downloadDir)
  } catch {
    await fs.mkdir(downloadDir)
  }

  const outputPath = join(downloadDir, filename)

  const response = await axios.get(url, {
    responseType: 'stream',
  })

  const writer = createWriteStream(outputPath)

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(outputPath))
    writer.on('error', (err) => reject(err))
  })
}