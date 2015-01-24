package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"

	"github.com/julien/gogala/lib"
	"golang.org/x/net/websocket"
	"golang.org/x/tools/playground/socket"
)

const (
	defaultName = "›µ-"
)

var (
	listenAddr = flag.String("addr", os.Getenv("PORT"), "Listen address")
	clients    = make(map[string]lib.Client)
	debug      lib.Debug
	verbose    bool
)

func init() {
	flag.BoolVar(&verbose, "verbose", true, "Debug mode")

	if *listenAddr == "" {
		*listenAddr = "8080"
	}
}

func main() {
	flag.Parse()

	debug = lib.Debug(verbose)

	u, err := url.Parse("ws://localhost:" + *listenAddr + "/co")
	if err != nil {
		debug.Printf("Error: %v\n", err)
	}

	http.Handle("/", indexHandler())
	http.Handle("/static/", lib.GZipHandler(lib.CacheHandler(30, staticHandler())))
	http.Handle("/ws", websocket.Handler(wsHandler))

	ws := socket.NewHandler(u)

	http.Handle("/co", ws.Handler)

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
	//! Remember: returning here disconnects client

	registerClient(ws)

	for {
		var msg lib.Message
		var out lib.Message

		if err := websocket.JSON.Receive(ws, &msg); err != nil {
			return
		}
		debug.Printf("Received message:\n%s\n", msg)

		// Analyse incoming messages
		switch msg.Kind {
		case "format":
			data, err := lib.Format([]byte(msg.Body))
			if err != nil {

				debug.Printf("Format Error:\n%s\n", err)

				out = lib.Message{
					Kind: "error",
					Body: err.Error(),
				}

				if err := sendMulti(ws, out); err != nil {
					debug.Printf("Error sending message:\n%s\n", err)
				}

			}

			out = lib.Message{
				Kind: "code",
				Body: string(data),
			}
			if err := sendMulti(ws, out); err != nil {
				debug.Printf("Error sending message:\n%s\n", err)
			}

		case "save":
			data, err := lib.CreateGist("GoGist", msg.Body)
			if err != nil {
				debug.Printf("Error creating gist:\n%v\n", err)
			}
			debug.Printf("Created gist:\n%s\n", data)

			// Parse Githubs reponse
			resp, err := lib.ParseResponse(data)
			if err != nil {
				debug.Printf("Error parsing Gists response:\n%s\n", err)
			}

			s := fmt.Sprintf("%s", resp["html_url"])
			debug.Printf("Gist response:\n%s\n", s)

			out = lib.Message{
				Kind: "gist",
				Body: s,
			}

			if err := sendMulti(ws, out); err != nil {
				debug.Printf("Error sending message:\n%s\n", err)
			}

		case "compile":
			debug.Printf("Client wants to compile code:\n%s\n", msg.Body)

			data, err := lib.Compile(msg.Body)
			if err != nil {
				debug.Printf("Error compiling code (remote):\n%s\n", err)
			}
			debug.Printf("Compiled code:\n%s\n", string(data))

			cr, err := lib.ParseCompileResponse(data)
			if err != nil {
				debug.Printf("Error parsing compile response:\n%s\n", err)
			}
			debug.Printf("Compile response:\n%s\n", cr)

			// WTF!
			if s := cr.Message(); s != nil {
				if ok := s.(string); ok != "" {
					out = lib.Message{
						Kind: "stdout",
						Body: s.(string),
					}

					if err := sendMulti(ws, out); err != nil {
						debug.Printf("Error sending message:\n%s\n", err)
					}
				}
			}

		case "chat":
			debug.Printf("The dude want to say something:\n%s\n", msg.Body)
			t := time.Now().Format(time.Kitchen)

			if c := getClient(ws); c != nil {
				out = lib.Message{
					Kind: "chat",
					Body: lib.AppendString("[", t, "]", c.Name, ": ", msg.Body),
				}
				if err := sendMulti(ws, out); err != nil {
					debug.Printf("Error sending message:\n%s\n", err)
				}
			}
		}

	}
}

func registerClient(ws *websocket.Conn) {

	c := 1
	for _ = range clients {
		c++
	}
	u := strconv.Itoa(c)
	if c < 10 {
		u = "0" + u
	}

	clients[u] = lib.Client{
		Id:   u,
		Name: defaultName + u,
		Conn: ws,
	}

	var msg lib.Message

	msg = lib.Message{
		Kind: "info",
		Body: "Welcome, " + clients[u].Name,
		Args: lib.MakeArgs("name"),
	}

	if err := sendToClient(ws, msg); err != nil {
		debug.Printf("Error sending message:\n%s\n", err)
	}

	msg = lib.Message{
		Kind: "info",
		Body: clients[u].Name + " joined",
	}
	if err := sendToOthers(ws, msg); err != nil {
		debug.Printf("Error sending mesaage to others:\n%s\n", err)
	}
}

func getClient(ws *websocket.Conn) *lib.Client {
	var c *lib.Client
	for _, v := range clients {
		if v.Conn == ws {
			return &v
		}
	}
	return c
}

func sendToClient(ws *websocket.Conn, msg lib.Message) error {
	if err := websocket.JSON.Send(ws, msg); err != nil {
		return err
	}
	return nil
}

func sendToOthers(ws *websocket.Conn, msg lib.Message) error {
	for _, v := range clients {
		if v.Conn != ws {
			return sendToClient(v.Conn, msg)
		}
	}
	return nil
}

func sendMulti(ws *websocket.Conn, msg lib.Message) error {

	if err := sendToClient(ws, msg); err != nil {
		debug.Printf("Error sending message to client:\n%s\n", err)
		return err
	}

	if err := sendToOthers(ws, msg); err != nil {
		debug.Printf("Error sending message to others:\n%s\n", err)
		return err
	}

	return nil
}
