# Vercel AI-Powered Todo Application

An intelligent todo application that uses Vercel AI SDK and OpenAI's API to help you manage tasks through natural language conversations.

## Features

- Create, update, and manage todos through natural language
- Chat with an AI assistant that understands your intentions
- Filter todos by completion status
- Responsive design for both desktop and mobile
- Client-side API key storage for easy deployment

## Live Demo

To use the live demo, you'll need your own OpenAI API key. The application will prompt you to enter it when you first load the page. Your API key is stored only in your browser's local storage and is never sent to our servers.

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn
- An OpenAI API key (get one at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys))

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Copy the `.env.template` file to `.env.local`:
   ```bash
   cp .env.template .env.local
   ```
4. (Optional) Add your OpenAI API key to `.env.local`:

   ```
   OPENAI_API_KEY=your-actual-api-key
   ```

   Note: You can also provide your API key through the in-app modal when you first use the application.

5. Start the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment

#### Deploy to Vercel

The easiest way to deploy this application is to use Vercel:

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Set the `OPENAI_API_KEY` environment variable in your Vercel project settings (optional)
4. Deploy!

If you don't set the `OPENAI_API_KEY` environment variable, users will be prompted to enter their own API key when they use the application.

## Using the Application

1. When you first open the application, you'll be prompted to enter your OpenAI API key if one isn't already set.
2. Use the chat interface to talk to the AI assistant. Try commands like:
   - "Add a task to call mom tomorrow"
   - "Create a task to finish the report by Friday"
   - "Show my completed tasks"
   - "Mark the first task as done"
3. The AI will understand your intentions and perform the appropriate actions on your todo list.
4. You can also manually manage your todos using the todo list interface.

## API Key Security

Your OpenAI API key is stored in your browser's local storage and is only used to make API requests directly from your browser. It is never stored on our servers or shared with any third parties.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
