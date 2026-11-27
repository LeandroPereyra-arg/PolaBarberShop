import com.eteks.sweethome3d.io.HomeFileRecorder;
import com.eteks.sweethome3d.j3d.ModelManager;
import com.eteks.sweethome3d.model.Home;
import com.eteks.sweethome3d.model.HomeDoorOrWindow;
import com.eteks.sweethome3d.model.HomePieceOfFurniture;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * Abre un archivo .sh3d con las clases de Sweet Home 3D y carga el modelo 3D de cada mueble,
 * para comprobar que el archivo generado por generar.py es válido.
 *
 * Uso (desde marketing/sweet-home, con LIB = carpeta lib de Sweet Home 3D):
 *   javac -cp "LIB/SweetHome3D.jar;LIB/java3d-1.6/*" -d clases VerificarSH3D.java
 *   java -cp "clases;LIB/*;LIB/java3d-1.6/*" VerificarSH3D local-polas.sh3d
 */
public class VerificarSH3D {
  public static void main(String[] args) throws Exception {
    // Misma configuración que usa la aplicación al abrir un archivo: acepta la entrada Home.xml.
    // Las preferencias no hacen falta para leer (y en la versión de Microsoft Store fallan sin la interfaz).
    HomeFileRecorder lector = new HomeFileRecorder(0, false, null, false, true, true);
    Home home = lector.readHome(args[0]);
    System.out.println("Muros: " + home.getWalls().size() + " | Ambientes: " + home.getRooms().size()
        + " | Muebles: " + home.getFurniture().size() + " | Etiquetas: " + home.getLabels().size()
        + " | Cotas: " + home.getDimensionLines().size());
    int errores = 0;
    for (HomePieceOfFurniture mueble : home.getFurniture()) {
      CompletableFuture<String> resultado = new CompletableFuture<>();
      ModelManager.getInstance().loadModel(mueble.getModel(), true, new ModelManager.ModelObserver() {
        public void modelUpdated(javax.media.j3d.BranchGroup modelo) {
          // Las medidas propias del modelo permiten notar si dos muebles distintos cargaron el mismo
          javax.vecmath.Vector3f tam = ModelManager.getInstance().getSize(modelo);
          resultado.complete(String.format("modelo OK  (modelo de %.0f x %.0f x %.0f)", tam.x, tam.z, tam.y));
        }

        public void modelError(Exception ex) {
          resultado.complete("ERROR: " + ex);
        }
      });
      String estado = resultado.get(60, TimeUnit.SECONDS);
      if (!estado.startsWith("modelo OK")) {
        errores++;
      }
      System.out.printf("  %-30s %-13s %s%n", mueble.getName(),
          mueble instanceof HomeDoorOrWindow ? "puerta/ventana" : "", estado);
      if (mueble.getTexture() != null) {
        System.out.printf("      textura \"%s\": %.0f x %.0f cm, ajustada a la cara: %s, imagen: %s%n",
            mueble.getTexture().getName(), mueble.getTexture().getWidth(), mueble.getTexture().getHeight(),
            mueble.getTexture().isFittingArea(), mueble.getTexture().getImage());
      }
    }
    System.out.println(errores == 0 ? "RESULTADO: todo OK" : "RESULTADO: " + errores + " errores");
    System.exit(errores == 0 ? 0 : 1);
  }
}
