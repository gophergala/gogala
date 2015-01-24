package lib

import (
	"bytes"

	"golang.org/x/net/websocket"
)

type Message struct {
	// in: "format", "edit", "message", "info"
	Kind string
	Body string
	Args []interface{}
}

func (m Message) String() string {
	var b bytes.Buffer
	b.WriteString(m.Kind)
	b.WriteString("\n")
	b.WriteString(m.Body)
	b.WriteString("\n")
	return b.String()
}

type Client struct {
	Id   string
	Name string
	Conn *websocket.Conn
}
