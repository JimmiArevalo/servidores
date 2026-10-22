from fastapi import FastAPI
import uvicorn
import sys

app = FastAPI(
    titlle = "Servidor de la red dinamica"
)

puerto =int(sys.argv[1]) 
nombre = sys.argv[2]

contador = 0


@app.get("/")
def inicio():
    return {
        "servidor": nombre,
        "mensaje": "servidor disponible",
        "puerto": puerto
    }

@app.get("/procesar")
def procesar():
    global contador
    contador += 1
    return {
        "servidor": nombre,
        "contador": contador,
        "solicitudes_atendidad": contador,
        "Resultado": "solicitud procesada correctamente"
    }

@app.get("/health") 
def health():
    return {
        "servidor": nombre,
        "estado": "activo",
        "puerto": puerto
    }

if __name__ == "__main__":
    uvicorn.run(
    app, 
    host="127.0.0.1",
    port=puerto
    )