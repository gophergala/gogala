package main

import (
	"flag"
	"log"
	"net/http"

	"github.com/julien/gogala/lib"
	"github.com/satori/go.uuid"
	"golang.org/x/net/websocket"
)

const (
	defaultName = "user-"
)

var (
	listenAddr = flag.String("addr", "8000", "Listen address")
	clients    = make(map[string]lib.Client)
	debug      lib.Debug
	verbose    bool
)

func init() {
	flag.BoolVar(&verbose, "verbose", true, "Debug mode")
}

func main() {
	flag.Parse()
	debug = lib.Debug(verbose)

	http.Handle("/", indexHandler())
	http.Handle("/static/", lib.GZipHandler(lib.CacheHandler(30, staticHandler())))
	http.Handle("/ws", websocket.Handler(wsHandler))

	debug.Printf("Listening on: %s\n", *listenAddr)

	log.Fatal(http.ListenAndServe(":"+*listenAddr, nil))
}

func indexHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/static/", http.StatusMovedPermanently)
	})
}

func staticHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, r.URL.Path[1:])
	})
}

func wsHandler(ws *websocket.Conn) {
	registerClient(ws)

	for {
		var msg lib.Message
		var out lib.Message

		if err := websocket.JSON.Receive(ws, &msg); err != nil {
			return
		}
		debug.Printf("Received message: %s\n", msg)

		switch msg.Kind {
		case "format":
			data, err := lib.Format([]byte(msg.Body))
			if err != nil {
				log.Printf("Error: %s\n", err)
			}
			out = lib.Message{
				Kind: "code",
				Body: string(data),
			}
			sendAll(out)
		}

	}
}

func registerClient(ws *websocket.Conn) {
	u := uuid.NewV4().String()

	clients[u] = lib.Client{
		Id:   u,
		Name: defaultName + u,
		Conn: ws,
	}

	msg := lib.Message{
		Kind: "info",
		Body: "Welcome, " + clients[u].Name,
		Args: lib.MakeArgs("name"),
	}

	sendMessage(u, msg)
}

func sendMessage(id string, msg lib.Message) error {
	if c, ok := clients[id]; ok {
		if err := websocket.JSON.Send(c.Conn, msg); err != nil {
			return err
		}
	}
	return nil
}

func sendAll(msg lib.Message) error {
	for _, c := range clients {
		if err := websocket.JSON.Send(c.Conn, msg); err != nil {
			return err
		}
	}
	return nil
}
