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
import { PromptTemplate } from 'langchain/prompts'
import { LLMChain, VectorDBQAChain } from 'langchain/chains'

/* Parsers */
import { WebBrowser } from 'langchain/tools/webbrowser'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'
import { UnstructuredLoader } from 'langchain/document_loaders/fs/unstructured'
import { Document } from 'langchain/document'
import SitemapXMLParser from 'sitemap-xml-parser'

/* Tools */
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { RedisCache } from 'langchain/cache/redis'
import { createClient } from 'redis'



app.post('/api/add', async (req, res) => {
    const {
      url,
      collection = process.env.OPENSEARCH_DEFAULT_INDEX,
      filter,
      limit,
      chunkSize = 2000,
      chunkOverlap = 250,
      sleep = 0,
    } = req.body
  
    const downloadDir = process.env.DOCS_DIRECTORY || 'docs'
  
    if (!url) {
      res.status(500).json({ message: 'Missing URL' })
      return
    }
  
    let encodedCollection = await sanitize(collection)
    let type = getFileType(url)
  
    if (type === 'URL' || type === 'HTML') {
      try {
        await addURL(url, encodedCollection, chunkSize, chunkOverlap)
        // Return the response to the user
        res.json({ response: 'added', collection: collection })
      } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Error processing the request' })
      }
    } else if (type === 'SITEMAP') {
      try {
        const sitemap = await parseSitmap(url, filter, limit)
  
        const asyncFunction = async (item) => {
          console.log('\nAdding >>', item)
          await addURL(item, encodedCollection, chunkSize, chunkOverlap)
        }
  
        const iterateAndRunAsync = async (array) => {
          for (const item of array) {
            await asyncFunction(item)
            await sleepWait(sleep)
          }
        }
  
        iterateAndRunAsync(sitemap).then(async () => {
          console.log('\nDone! | Collection:', collection)
  
          // Return the response to the user
          res.json({ response: 'started', collection: collection })
        })
      } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Error processing the sitemap' })
      }
    } else if (type === 'PDF') {
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
  
        /* Clean metadata for OpenSearch */
        docOutput.forEach((document) => {
          document.metadata.source = basename(document.metadata.source)
          delete document.metadata.pdf
          delete document.metadata.loc
        })
  
        let vectorStore = await OpenSearchVectorStore.fromDocuments(
          docOutput,
          new OpenAIEmbeddings(),
          {
            client,
            indexName: encodedCollection,
          }
        )
        vectorStore = null
        console.log('✔ Added!')
        // Return the response to the user
        res.json({ response: 'added', collection: collection })
      } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Error processing the PDF' })
      }
    } else if (type === 'UNSTRUCTURED') {
      try {
        // Check if the URL points to a file and extract the filename with the extension.
        const filename = getUrlFilename(url)
  
        if (!filename) {
          res.status(400).json({ message: 'The provided URL is not a file URL.' })
          return
        }
  
        const filePath = await fetchAndSaveFile(url, filename, downloadDir)
  
        const loader = new UnstructuredLoader(
          `${process.env.UNSTRUCTURED_URL}/general/v0/general`,
          filePath
        )
  
        const docs = await loader.load()
  
        const textSplitter = new RecursiveCharacterTextSplitter({
          chunkSize: chunkSize,
          chunkOverlap: chunkOverlap,
        })
  
        const docOutput = await textSplitter.splitDocuments(docs)
  
        /* Clean metadata for OpenSearch */
        docOutput.forEach((document) => {
          document.metadata.source = document.metadata.filename
          delete document.metadata.filename
          delete document.metadata.category
          delete document.metadata.loc
        })
  
        // Create a new document for the URL
        let vectorStore = await OpenSearchVectorStore.fromDocuments(
          docOutput,
          new OpenAIEmbeddings(),
          {
            client,
            indexName: encodedCollection,
          }
        )
        vectorStore = null
        console.log('Added!')
        // Return the response to the user
        res.json({ response: 'added', collection: collection })
      } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Error processing the file.' })
      }
    }
  })