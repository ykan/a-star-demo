import 'normalize.css';

import React from 'react';
import ReactDOM from 'react-dom';

import { css } from '@emotion/react';
import styled from '@emotion/styled';

import { createAStarFinder, createGrid, createListener, Grid, Node } from './createAStarFinder';

const GridContainer = styled.div`
  display: flex;
  margin: 0 auto;
  width: 600px;
  height: 600px;
  background-color: #f2f2f2;
  margin-bottom: 10px;
  flex-wrap: wrap;
`
type BlockType = 'wall' | 'start' | 'end' | 'default'
const BlockContainer = styled.div<{ $type: BlockType }>`
  display: flex;
  box-sizing: border-box;
  border: 1px solid #fff;
  width: 60px;
  height: 60px;
  background-color: rgba(200, 200, 200, 0.5);
  font-size: 8px;
  position: relative;
  ${(props) => {
    if (props.$type === 'wall') {
      return css`
        background-color: #666;
      `
    }
    if (props.$type === 'start') {
      return css`
        background-color: red;
      `
    }
    if (props.$type === 'end') {
      return css`
        background-color: green;
      `
    }
    return css`
      background-color: rgba(200, 200, 200, 0.5);
    `
  }}
`
const Container = styled.div`
  margin: 0 auto;
  width: 600px;
`

interface BlockProps {
  node: Node
}

interface IGridContext {
  globals: {
    startNode?: Node
    endNode?: Node
    status: 'set-wall' | 'set-start' | 'set-end' | 'search'
    listener: ReturnType<typeof createListener>
    finder: ReturnType<typeof createAStarFinder>
  }
  grid: Grid
}

const GridContext = React.createContext<IGridContext>({
  grid: createGrid(10, 10),
  globals: {
    status: 'set-wall',
    listener: createListener(),
    finder: createAStarFinder(),
  },
})

const BlockResult = styled.div<{ $selected: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  ${({ $selected }) => {
    if ($selected) {
      return css`
        background-color: rgba(0, 255, 0, 0.5);
      `
    }
    return css`
      background-color: rgba(0, 0, 0, 0.3);
    `
  }}

  span {
    display: block;
  }

  .f {
    position: absolute;
    left: 5px;
    top: 5px;
  }

  .g {
    position: absolute;
    left: 5px;
    bottom: 5px;
  }
  .h {
    position: absolute;
    right: 5px;
    bottom: 5px;
  }
`

function Block(props: BlockProps) {
  const { globals } = React.useContext(GridContext)
  const [_, setState] = React.useState(0)
  const forceUpdate = React.useCallback(() => setState((n) => n + 1), [])
  const lastF = React.useRef(props.node.f)
  const handleClick = React.useCallback(() => {
    if (globals.status === 'set-wall') {
      props.node.walkable = false
    } else if (globals.status === 'set-start') {
      globals.startNode = props.node
    } else if (globals.status === 'set-end') {
      globals.endNode = props.node
    } else {
      return
    }
    forceUpdate()
  }, [forceUpdate, globals, props.node])
  let result
  if (props.node.walkable && props.node.f) {
    result = (
      <BlockResult $selected={!!props.node.selected}>
        <span className="f">f={props.node.f}</span>
        <span className="g">g={props.node.g}</span>
        <span className="h">h={props.node.h}</span>
      </BlockResult>
    )
  }
  let $type: BlockType = 'default'
  if (!props.node.walkable) {
    $type = 'wall'
  } else if (props.node === globals.startNode) {
    $type = 'start'
  } else if (props.node === globals.endNode) {
    $type = 'end'
  }
  React.useEffect(() => {
    globals.listener.onChange(() => {
      if (lastF.current !== props.node.f || props.node.selected) {
        lastF.current = props.node.f
        forceUpdate()
      }
    })
  }, [])
  return (
    <BlockContainer $type={$type} onClick={handleClick}>
      {result}
    </BlockContainer>
  )
}

function GridView() {
  const blocks = []
  const { grid } = React.useContext(GridContext)
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const node = grid.getNodeAt(i, j)
      blocks.push(<Block key={`${i}${j}`} node={node!} />)
    }
  }

  return <GridContainer>{blocks}</GridContainer>
}

function App() {
  const { globals, grid } = React.useContext(GridContext)
  const [_, setState] = React.useState(0)
  const forceUpdate = React.useCallback(() => setState((n) => n + 1), [])
  const handleSetWall = React.useCallback(() => {
    globals.status = 'set-wall'
    forceUpdate()
  }, [forceUpdate, globals])
  const handleSetStart = React.useCallback(() => {
    globals.status = 'set-start'
    forceUpdate()
  }, [forceUpdate, globals])
  const handleSetEnd = React.useCallback(() => {
    globals.status = 'set-end'
    forceUpdate()
  }, [forceUpdate, globals])

  const stepFn = React.useRef<(() => boolean) | undefined>()
  const handleStartSearch = React.useCallback(() => {
    if (stepFn.current) {
      const isEnd = stepFn.current()
      globals.listener.emit()
      if (isEnd) {
        stepFn.current = () => false
      }
    } else if (!stepFn.current && globals.startNode && globals.endNode) {
      stepFn.current = globals.finder.findPath(globals.startNode, globals.endNode, grid)
    }
  }, [])
  return (
    <Container>
      <GridView />
      <div>
        <button onClick={handleSetWall}>Set Wall</button>
        <button onClick={handleSetStart}>Set Start</button>
        <button onClick={handleSetEnd}>Set End</button>
        <button onClick={handleStartSearch}>Search Step</button>
      </div>
    </Container>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
