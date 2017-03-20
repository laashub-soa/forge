import React, { Component } from 'react'
import './App.css'
import "../node_modules/react-vis/dist/style.css"
import "../semantic/dist/semantic.min.css"
import io from 'socket.io-client'

import { Form, Image, Header, Card, Grid, Menu, Button, Icon, Input, Modal, Message } from 'semantic-ui-react'

class CreateService extends Component {

  constructor(props) {
    super(props)
    this.state = {
      open: false,
      name: '',
      owner: ''
    }
    this.name = this.name.bind(this)
    this.owner = this.owner.bind(this)
    this.open = this.open.bind(this)
    this.create = this.create.bind(this)
    this.close = this.close.bind(this)
  }

  name(e) {
    this.setState({name: e.target.value})
  }

  owner(e) {
    this.setState({owner: e.target.value})
  }

  open() {
    this.setState({open: true})
  }

  create(e) {
    let params = new URLSearchParams()
    params.append('name', this.state.name)
    params.append('owner', this.state.owner)
    let url = this.props.url + '/create?' + params.toString()
    fetch(url).then(this.close)
  }

  close() {
    this.setState({open: false, name: '', owner: ''})
  }

  render() {
    return (
        <Modal open={this.state.open} trigger={this.props.trigger}
               onOpen={() => this.setState({open: true})}
               onClose={this.close}>
          <Modal.Header>Create a Service</Modal.Header>
          <Modal.Content>
            <Form as='div'>
              <Form.Field>
                <label>Service Name</label>
                <Input placeholder='name' value={this.state.name} onChange={this.name}/>
              </Form.Field>
              <Form.Field>
                <label>Service Owner</label>
                <Input placeholder='owner' value={this.state.owner} onChange={this.owner}/>
              </Form.Field>
              <Button primary onClick={this.create}>Create</Button>
              <Button secondary onClick={this.close}>Cancel</Button>
            </Form>
          </Modal.Content>
        </Modal>
    )
  }
}

import {RadialChart} from 'react-vis'

const rateStyle = {
  position: 'absolute',
  width: 100,
  height: 100,
  textAlign: 'center',
  verticalAlign: 'middle',
  lineHeight: '100px'
}

function abbrev(mag) {
  if (mag === 1000) {
    return 'K'
  }
  if (mag === 1000000) {
    return 'M'
  }
}

function format(n) {
  if (n < 100) {
    return n.toFixed(1)
  }

  var mag
  for (mag of [1000, 1000000]) {
    if ((n / mag) < 100) {
      break;
    }
  }

  return (n/mag).toFixed(1) + abbrev(mag)
}

class ServiceCard extends Component {
  render() {
    let stats = this.props.stats
    let rate = stats.good + stats.bad + stats.slow
    let data = [{angle: stats.good, color: 'green'},
                {angle: stats.slow, color: 'yellow'},
                {angle: stats.bad, color: 'red'}]
    if (rate === 0.0) {
      data = [{angle: 1, color: 'grey'}]
    }
    return (<Card key={this.props.name} raised>
              <Card.Content>
                <div style={{float: 'right'}}>
            <Header style={rateStyle}>{rate !== 0 ? format(rate) : "--"}</Header>
                  <RadialChart width={100} height={100} innerRadius={25} colorType='literal' data={data} />
                </div>
                <Card.Header>{this.props.name}</Card.Header>
                <Card.Meta>{this.props.owner}</Card.Meta>
              </Card.Content>
            </Card>)
  }
}

class ServiceGroup extends Component {
  render() {
    if (this.props.children.length > 0) {
      return (<Card.Group>{this.props.children}</Card.Group>)
    } else {
      return (<Message>No services...</Message>)
    }
  }
}

class App extends Component {

  constructor(props) {
    super(props)
    this.state = {
      count: 0,
      services: []
    }
    this.url = 'http://' + window.location.hostname + ':' + window.location.port
    if (process.env.NODE_ENV === 'development') {
      this.url = process.env.REACT_APP_BLACKBIRD_RTM
    }
  }

  componentDidMount() {
    this.socket = io(this.url)
    this.socket.on('message', (msg) => {
      if (this.state.count % 10 === 0) {
        console.log(msg)
      }
      this.setState({count: this.state.count + 1})
    })
    this.socket.on('dirty', (srv) => {
      this.update(srv)
    })

    fetch(this.url + '/get')
      .then((response) => response.json())
      .then((result) => {
        for (let svc of result) {
          this.update(svc)
        }
      })
  }

  update(srv) {
    let found = false
    for (let service of this.state.services) {
      if (service.name === srv.name) {
        service.owner = srv.owner
        service.stats = srv.stats
        found = true
        break
      }
    }
    if (!found) {
      this.state.services.push(srv)
    }
    this.setState({services: this.state.services})
  }

  render() {
    let services = []
    for (let srv of this.state.services) {
      services.push(<ServiceCard key={srv.name} {...srv}/>)
    }

    let on = this.state.count % 2 === 0
    return (
      <div className="App">
        <Grid padded textAlign="left">
          <Grid.Row centered>
            <Grid.Column width={1}/>
            <Grid.Column width={14} textAlign="center">
        <h1><Image src="https://www.datawire.io/wp-content/uploads/2017/01/blackbird.png" avatar/>Blackbird Service Registry</h1>
            </Grid.Column>
            <Grid.Column textAlign="right" width={1}>
              <Icon.Group size='big'>
                <Icon name='cloud'/>
                <Icon corner color={on ? 'red' : 'grey'} disabled={!on} name='heartbeat'/>
              </Icon.Group>
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width={3}>
              <Menu vertical>
                <Menu.Item name='settings'>Settings</Menu.Item>
                <Menu.Item name='admin'>Administration</Menu.Item>
                <CreateService url={this.url} trigger={<Menu.Item name='create'>Create Service</Menu.Item>}/>
                <Menu.Item name='search'><Input icon='search' placeholder='Search services...'/></Menu.Item>
              </Menu>
            </Grid.Column>
            <Grid.Column width={13}>
              <ServiceGroup>{services}</ServiceGroup>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </div>
    )
  }
}

export default App