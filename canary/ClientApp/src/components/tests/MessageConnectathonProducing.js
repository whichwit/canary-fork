import axios from 'axios';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, Button, Container, Dimmer, Divider, Dropdown, Form, Grid, Header, Icon, Loader, Menu, Message, Statistic, Transition } from 'semantic-ui-react';
import { messageTypeIcons, messageTypes, stateOptions } from '../../data';
import { connectionErrorToast } from '../../error';
import { Getter } from '../misc/Getter';
import { FHIRInfo } from '../misc/info/FHIRInfo';
import { Record } from '../misc/Record';
import report from '../report';

export class MessageConnectathonProducing extends Component {
  displayName = MessageConnectathonProducing.name;

  constructor(props) {
    super(props);
    // Record is generated by the backend for ths test and provided to the user
    // message is the user provided data that we are verifying to be correct
    this.state = { ...this.props, record: null, message: null, loading: false, running: false };
    this.setEmptyToNull = this.setEmptyToNull.bind(this);
    this.runTest = this.runTest.bind(this);
    this.updateMessage = this.updateMessage.bind(this);
    this.fetchTest = this.fetchTest.bind(this);
    this.setExpectedMessageType = this.setExpectedMessageType.bind(this);
  }

  fetchTest(_, data) {
    var self = this;
    console.log(data);
    if (!!this.props.match.params.id) {
      this.setState({ loading: true }, () => {
        axios
          .get(window.API_URL + '/tests/connectathon/' + this.props.match.params.id + '/' + data.value)
          .then(function(response) {
            var test = response.data;
            test.results = JSON.parse(test.results);
            self.setState({ test: test, record: test.referenceRecord, loading: false });
          })
          .catch(function(error) {
            self.setState({ loading: false }, () => {
              connectionErrorToast(error);
            });
          });
      });
    }
  }

  updateMessage(message, issues) {
    let messageType = "Unknown";
    if (message && message.messageType in messageTypes) {
      messageType = messageTypes[message.messageType];
    }

    /*
     * Only perform this when there are no other issues, since receiving errors here means
     * the message was probably not parsed correctly.
    */
    if (messageType !== this.state.expectedType && issues instanceof Array && !issues.length) {
      issues.push({
        'message': `Unexpected message type encountered, received a message of type ${messageType} but expected a message of type ${this.state.expectedType}.`,
        'severity': 'error'
      });
    }

    this.setState({ message: message, actualType: messageType, issues: issues });
  }

  setExpectedMessageType(_, { name }) {
    this.setState({ expectedType: name });
  }

  setEmptyToNull(obj) {
    const o = JSON.parse(JSON.stringify(obj));
    Object.keys(o).forEach(key => {
      if (o[key] && typeof o[key] === 'object') o[key] = this.setEmptyToNull(o[key]);
      else if (o[key] === undefined || o[key] === null || (!!!o[key] && o['Type'] !== 'Bool')) o[key] = null;
      // eslint-disable-next-line
      else o[key] = o[key];
    });
    return o;
  }

  runTest() {
    var self = this;
    this.setState({ running: true }, () => {
      axios
        .post(window.API_URL + '/tests/' + this.state.expectedType + 'MessageProducing/run/' + this.state.test.testId, this.state.message.json, { headers: { 'Content-Type': 'application/json' } })
        .then(function(response) {
          var test = response.data;
          test.results = JSON.parse(test.results);
          self.setState({ test: test, running: false });
        })
        .catch(function(error) {
          self.setState({ loading: false, running: false }, () => {
            connectionErrorToast(error);
          });
        });
    });
  }

  downloadAsFile(contents) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contents));
    element.setAttribute('download', `canary-report-${this.connectathonRecordName(this.props.match.params.id).toLowerCase()}-${new Date().getTime()}.html`);
    element.click();
  }

  connectathonRecordName(id) {
    switch (id) {
      case "1":
        return "Cancer";
      case "2":
        return "Opioid Death at Home";
      case "3":
        return "Pregnant";
      case "4":
        return "Car accident at work: Full";
      case "5":
        return "Car accident at work: Partial";
      default:
        return "Undefined"
    }
  }

  render() {
    return (
      <React.Fragment>
          <Grid.Row>
            <Breadcrumb>
              <Breadcrumb.Section as={Link} to="/">
                Dashboard
              </Breadcrumb.Section>
              <Breadcrumb.Divider icon="right chevron" />
              <Breadcrumb.Section>Connectathon FHIR Message Producing</Breadcrumb.Section>
            </Breadcrumb>
          </Grid.Row>
          {!!this.state.test && this.state.test.completedBool && (
            <Grid.Row className="loader-height">
              <Container>
                <div className="p-b-10" />
                <Statistic.Group widths="three">
                  <Statistic size="large">
                    <Statistic.Value>{this.state.test.total}</Statistic.Value>
                    <Statistic.Label>Properties Checked</Statistic.Label>
                  </Statistic>
                  <Statistic size="large" color="green">
                    <Statistic.Value>
                      <Icon name="check circle" />
                      {this.state.test.correct}
                    </Statistic.Value>
                    <Statistic.Label>Correct</Statistic.Label>
                  </Statistic>
                  <Statistic size="large" color="red">
                    <Statistic.Value>
                      <Icon name="times circle" />
                      {this.state.test.incorrect}
                    </Statistic.Value>
                    <Statistic.Label>Incorrect</Statistic.Label>
                  </Statistic>
                </Statistic.Group>
                <Grid centered columns={1} className="p-t-30 p-b-15">
                  <Button icon labelPosition='left' primary onClick={() => this.downloadAsFile(report(this.state.test, this.connectathonRecordName(this.props.match.params.id)))}><Icon name='download' />Generate Downloadable Report</Button>
                </Grid>
                <div className="p-b-20" />
                <Form size="large">
                  <FHIRInfo fhirInfo={this.state.test.results} hideSnippets={true} editable={false} testMode={true} />
                </Form>
              </Container>
            </Grid.Row>
          )}
          {!(!!this.state.test && this.state.test.completedBool) && (
            <React.Fragment>
              <Grid.Row>
                <Container fluid>
                  <Divider horizontal />
                  <Header as="h2" dividing id="step-1">
                    <Icon name="flag" />
                    <Header.Content>
                      Step 1: Select State
                      <Header.Subheader>
                        Select the state which you are generating a message from.
                      </Header.Subheader>
                    </Header.Content>
                  </Header>
                  <div className="p-b-15" />
                  <Dropdown placeholder='Select State' search selection fluid onChange={this.fetchTest} options={stateOptions} />
                </Container>
              </Grid.Row>
              {!(!!this.state.test && this.state.test.completedBool) && !!this.state.loading && (
                <Grid.Row className="loader-height">
                  <Container>
                    <Dimmer active inverted>
                      {!!this.props.match.params.id && <Loader size="massive">Loading Test...</Loader>}
                    </Dimmer>
                  </Container>
                </Grid.Row>
              )}
              {(!!this.state.test && !this.state.test.completedBool) && !this.state.loading && (
                <React.Fragment>
                  <Grid.Row>
                    <Container fluid>
                      <Divider horizontal />
                      <Header as="h2" dividing id="step-2">
                        <Icon name="download" />
                        <Header.Content>
                          Step 2: Import Record
                          <Header.Subheader>
                            Import the generated record into your system. The below prompt allows you to copy the record, download it as a file, or POST it to
                            an endpoint.
                          </Header.Subheader>
                        </Header.Content>
                      </Header>
                      <div className="p-b-15" />
                      <Record record={this.state.record} showSave lines={20} showIje />
                    </Container>
                  </Grid.Row>
                  <Grid.Row>
                    <Container fluid>
                      <Divider horizontal />
                      <Header as="h2" dividing id="step-3">
                        <Icon name="mail" />
                        <Header.Content>
                          Step 3: Choose the Message Type
                          <Header.Subheader>Select the type of message you would like Canary to validate.</Header.Subheader>
                        </Header.Content>
                      </Header>
                      <Menu items={messageTypeIcons} widths={messageTypeIcons.length} onItemClick={this.setExpectedMessageType} />
                    </Container>
                  </Grid.Row>
                <Grid.Row>
                  {!!this.state.expectedType && (
                    <div className="inherit-width">
                      <Transition transitionOnMount animation="fade" duration={1000}>
                        <div className="inherit-width">
                          <Message icon size="large" info>
                            <Icon name="info circle" />
                            <Message.Content>Canary will expect a {this.state.expectedType} Message</Message.Content>
                          </Message>
                        </div>
                      </Transition>
                    </div>
                  )}
                </Grid.Row>
                {!!this.state.expectedType && (
                  <React.Fragment>
                    <Grid.Row>
                      <Container fluid>
                        <Divider horizontal />
                        <Header as="h2" dividing id="step-3">
                          <Icon name="keyboard" />
                          <Header.Content>
                            Step 4: Export Message
                            <Header.Subheader>
                              Export a {this.state.expectedType} message for the record above and import it into Canary using the tool below.
                            </Header.Subheader>
                          </Header.Content>
                        </Header>
                        <div className="p-b-10" />
                        <Getter updateRecord={this.updateMessage} strict messageValidation={true} allowIje={false} />
                      </Container>
                    </Grid.Row>
                    <div className="p-b-15" />
                    {!!this.state.issues && (
                      <Grid.Row>
                        <Record record={null} issues={this.state.issues} messageType={this.state.actualType} messageValidation={true} showIssues showSuccess />
                      </Grid.Row>
                    )}
                    <Grid.Row>
                      <Container fluid>
                        <Divider horizontal />
                        <Header as="h2" dividing className="p-b-5" id="step-4">
                          <Icon name="check circle" />
                          <Header.Content>
                            Step 5: Calculate Results
                            <Header.Subheader>
                              When you have imported the message into Canary, click the button below and Canary will calculate the results of the test.
                            </Header.Subheader>
                          </Header.Content>
                        </Header>
                        <div className="p-b-10" />
                        <Button fluid size="huge" primary onClick={this.runTest} loading={this.state.running} disabled={!!!this.state.message}>
                        Calculate
                        </Button>
                      </Container>
                    </Grid.Row>
                  </React.Fragment>
                )}
              </React.Fragment>
            )}
          </React.Fragment>
          )}
      </React.Fragment>
    );
  }
}
