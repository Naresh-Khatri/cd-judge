# CD-Judge

CD-Judge is a robust code execution engine developed as an evolution of the Coding Ducks project. It serves as a reliable solution for running and evaluating code submissions in a secure and controlled environment.

## Overview

This project was born from the need for a more robust code execution system to replace the makeshift coderunner in the original Coding Ducks project. CD-Judge provides a secure, scalable, and efficient solution for executing and evaluating code submissions.

## Features

- Secure code execution in isolated environments
- Support for multiple programming languages
- Real-time code evaluation
- Resource usage monitoring and limitations
- Standardized input/output handling
- Test case management

## Usage

usage coming soon

## API Endpoints

## 1. Execute Code

- **Endpoint**: `/execute`
- **Method**: `POST`
- **Description**: Submits code for execution in a specified programming language.
- **Request Body**:
  ```json
  {
    "code": "string", // The code to execute
    "lang": "string", // Supported languages: "py", "js", "java", "cpp"
    "stdin": "string", // Optional input for the code
    "timeLimit": "number", // Optional time limit for execution in seconds (default: 1)
    "memoryLimit": "number", // Optional memory limit in bytes (default: 512 * 1024)
    "wait": "boolean" // Optional flag to wait for the job to complete (default: false)
  }
  ```
- **Response**:
  - **Success (201)**:
    ```json
    {
      "id": "string", // Job ID
      "status": "queued" // Initial status of the job
    }
    ```
  - **Error (400)**:
    ```json
    {
      "error": "string" // Error message detailing the issue
    }
    ```

## 2. Check Status

- **Endpoint**: `/status`
- **Method**: `GET`
- **Description**: Retrieves the current status of the service, including uptime and health information.
- **Response**:
  - **Success (200)**:
    ```json
    {
      "status": "running", // Service status (e.g., "running", "down")
      "uptime": 3600, // Uptime in seconds
      "jobs": [
        {
          "id": "uuid", // Job ID
          "status": "queued", // Current job status
          "details": {
            "lang": "js", // Language of the job
            "code": "string", // Code submitted for execution
            "createdAt": "timestamp",
            "memoryLimit": 512000,
            "subProcessLimit": 1,
            "stdin": "",
            "timeLimit": 1
          },
          "result": {
            "verdict": "OK",
            "time": 0.5,
            "memory": 256,
            "stdout": "Output here",
            "stderr": null
          }
        }
      ]
    }
    ```
  - **Error (500)**:
    ```json
    {
      "error": "string" // Error message detailing the issue
    }
    ```

## Getting Started

### Prerequisites

- Docker

### Installation

1. Clone the repository:

```bash
git clone https://github.com/naresh-khatri/cd-judge.git
cd cd-judge
```

2. build project:

```bash
make build
```

3. Run it

```bash
make up
```

## Architecture

CD-Judge uses a containerized approach to execute code securely. Each submission runs in its own isolated environment with:

- Resource limitations
- Network restrictions
- Filesystem isolation
- Memory constraints

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the [Choose a license] License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Original Coding Ducks project
- [Add other acknowledgments]

## Contact

Your Name - [@notHotChaddi](https://x.com/notHotChaddi)
Project Link: [https://github.com/naresh-khatri/cd-judge](https://github.com/naresh-khatri/cd-judge)
