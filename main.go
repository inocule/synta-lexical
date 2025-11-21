// main.go
package main

import (
	"fmt"
	"synta-lexical/lexer"
	"synta-lexical/token"
)

func main() {
	code := `
	@agent AICoder {
		role: "Chatbot with GitHub MCP access"
		tools: [github_mcp, slm_chatbot]
		model: "local/llama-3.1-8b.gguf"
		mode: "hybrid"
		sys_prompt: "You are a chatbot capable of helping coders who is updated on GitHub repositories"
	}
	
	@task {
		response := AICoder -> "Fix this line of text"
		print(response)
	}

	bind int x =: 10;
	const PI =: 3.14;
	x =: 20;
	
	fn calculate(a, b) {
		if a > b {
			return a + b;
		} else {
			return a - b;
		}
	}
	
	// This is a one-line comment
	/~ 
	This is a 
	multi-line 
	comment 
	~/
	
	int i =: 0;
	while i < 5 {
		print("Hello World");
		i++;
	}
	`

	l := lexer.New(code)
	tokens := l.Tokenize()

	fmt.Println("Synta Lexer - Token Output")
	fmt.Println("===========================")
	for _, tok := range tokens {
		if tok.Type == token.NEWLINE {
			continue // Skip printing newlines for cleaner output
		}

		typeName := token.TokenNames[tok.Type]
		if typeName == "" {
			typeName = fmt.Sprintf("TokenType(%d)", tok.Type)
		}

		fmt.Printf("%-15s %-20s Line: %d, Col: %d\n",
			typeName, fmt.Sprintf("'%s'", tok.Lexeme), tok.Line, tok.Column)
	}
}
