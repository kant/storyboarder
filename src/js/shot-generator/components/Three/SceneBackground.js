import React, { useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { useThree } from 'react-three-fiber'
import { useAsset } from '../../hooks/use-assets-manager'
import CubeMapDrawingTexture from './helpers/cubeMapDrawingTexture'
import CubeTextureCreator from './helpers/CubeTextureCreator'
import fs from 'fs-extra'
import path from 'path'

const SceneBackground = React.memo(({ imagePath, world, storyboarderFilePath, updateWorld, drawingSceneTexture }) => {
    const texturePath = useRef()
    const { scene, camera, gl } = useThree()
    const { asset: gltf } = useAsset(!scene.userData.tempPath ? imagePath[0] : imagePath[0].includes(scene.userData.tempPath ) ? null : imagePath[0])
    const intersectionBox = useRef()
    const intersectionCamera = useRef()
    const cubeTextureCreator = useRef( new CubeTextureCreator())
    
    useEffect(() => {
        drawingSceneTexture.texture = new CubeMapDrawingTexture()
        let geometry = new THREE.BoxBufferGeometry(1, 1, 1)
        let material = new THREE.MeshBasicMaterial({ side: THREE.BackSide})
        intersectionBox.current = new THREE.Mesh(geometry, material)
        intersectionCamera.current = camera.clone()
        return () => {
            intersectionBox.current.geometry.dispose()
            intersectionBox.current.material.dispose()
            if(scene.background instanceof THREE.Texture) {
                scene.background.dispose()
            }
        }
    }, [])

    useEffect(() => {
        scene.background = new THREE.Color(world.backgroundColor)
    }, [world.backgroundColor])

    const draw = (mousePos, camera, drawingBrush) => {
        drawingSceneTexture.texture.createMaterial(scene.background);
        intersectionCamera.current.copy(camera)
        intersectionCamera.current.position.set(0, 0, 0)
        intersectionCamera.current.quaternion.copy(camera.worldQuaternion())
        intersectionCamera.current.updateMatrixWorld(true)
        drawingSceneTexture.texture.draw(mousePos, intersectionBox.current, intersectionCamera.current, drawingBrush)
    }

    useMemo(() => {
        if(!gltf) return
        let cubeTexture;
        if(scene.userData.tempPath) {
            let tempFile = path.join(path.dirname(storyboarderFilePath), 'models/sceneTextures/', scene.userData.tempPath)
            fs.remove(tempFile)
            scene.userData.tempPath = null
        }
        if(gltf instanceof THREE.Texture) {
            cubeTexture = cubeTextureCreator.current.getCubeMapTexture(gltf, storyboarderFilePath);
        }

        if(cubeTexture) {
            scene.background = cubeTexture;
            scene.userData.texturePath = imagePath[0]
            drawingSceneTexture.draw = draw
            drawingSceneTexture.save = () => { 
                if(scene.userData.tempPath) {
                    let tempFile = path.join(path.dirname(storyboarderFilePath), 'models/sceneTextures/', scene.userData.tempPath)
                    fs.remove(tempFile)
                    scene.userData.tempPath = null
                }
                let tempFileName = `temp_scenetexture-${Date.now()}.png`
                cubeTextureCreator.current.saveCubeMapTexture(imagePath[0], scene.background, tempFileName) 
                updateWorld({sceneTexture: 'models/sceneTextures/' + tempFileName})
                scene.userData.tempPath = tempFileName
                texturePath.current = tempFileName
            }
        } else {
            if(scene.background instanceof THREE.CubeTexture) {
                scene.background.dispose();
                gltf.dispose();
                scene.background = null;
            }
            updateWorld({sceneTexture:null});
        }
    }, [gltf])

     
    return null
})
export default SceneBackground;