import com.eteks.sweethome3d.io.HomeFileRecorder;
import com.eteks.sweethome3d.j3d.PhotoRenderer;
import com.eteks.sweethome3d.model.Camera;
import com.eteks.sweethome3d.model.Home;
import com.eteks.sweethome3d.model.Room;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;

/**
 * Genera fotos 3D del maquetado con el motor de fotos de Sweet Home 3D (el mismo de "Vista 3D → Crear foto").
 *
 * Uso (con LIB = carpeta lib de Sweet Home 3D y NATIVOS = carpeta con gluegen_rt.dll y jogl_desktop.dll):
 *   javac -cp "LIB/SweetHome3D.jar;LIB/java3d-1.6/*" -d clases FotoSH3D.java
 *   java -Djava.library.path=NATIVOS -cp "clases;LIB/*;LIB/java3d-1.6/*" FotoSH3D local-polas.sh3d CARPETA [alta]
 */
public class FotoSH3D {
  public static void main(String[] args) throws Exception {
    File carpeta = new File(args[1]);
    PhotoRenderer.Quality calidad = args.length > 2 && args[2].equalsIgnoreCase("alta")
        ? PhotoRenderer.Quality.HIGH : PhotoRenderer.Quality.LOW;
    Home home = new HomeFileRecorder(0, false, null, false, true, true).readHome(args[0]);
    // Sin techo: entra la luz del cielo y desde arriba se ve el interior
    for (Room ambiente : home.getRooms()) {
      ambiente.setCeilingVisible(false);
    }
    float grado = (float) Math.PI / 180;
    Object[][] vistas = {
        // archivo, ancho y alto de la imagen, cámara (x, y, altura en cm, giro, inclinación hacia abajo, apertura de lente)
        // Aérea: centrada sobre la vidriera, así las paredes laterales no tapan los muebles pegados a ellas
        {"sh3d-vista-aerea.png", 1000, 1300, new Camera(250, -100, 1500, 0, 70 * grado, 32 * grado)},
        {"sh3d-vista-interior.png", 1400, 875, new Camera(300, 60, 165, 20 * grado, 8 * grado, 75 * grado)},
        // Sala de espera: desde la zona de la ropa, mirando al cartel con el logo, el sofá y la entrada
        {"sh3d-vista-espera.png", 1400, 875, new Camera(380, 330, 160, 109.5f * grado, 5 * grado, 70 * grado)},
    };
    for (Object[] vista : vistas) {
      long inicio = System.currentTimeMillis();
      BufferedImage imagen = new BufferedImage((Integer) vista[1], (Integer) vista[2], BufferedImage.TYPE_INT_RGB);
      PhotoRenderer motor = new PhotoRenderer(home, calidad);
      motor.render(imagen, (Camera) vista[3], null);
      motor.dispose();
      File salida = new File(carpeta, (String) vista[0]);
      ImageIO.write(imagen, "png", salida);
      System.out.printf("%s (%d s)%n", salida.getName(), (System.currentTimeMillis() - inicio) / 1000);
    }
    System.exit(0);
  }
}
